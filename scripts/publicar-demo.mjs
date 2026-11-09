#!/usr/bin/env node
// Publica o front de DEMONSTRAÇÃO na Vercel, apontando para o Supabase de desenvolvimento,
// COM PROTEÇÃO DE ACESSO (decisão do Marcelo, 04/11/2026):
//   1. garante o projeto no time com Vercel Authentication ligada (ssoProtection);
//   2. build local com as VITE_* do .env.local; a Vercel recebe só dist/ (nenhuma variável fica lá);
//   3. publica pela API como PRÉ-VISUALIZAÇÃO e depois aponta o endereço principal para ela;
//   4. abre o link sem login: se não pedir autenticação, APAGA a publicação e falha.
// Uso: npm run publicar:demo   (VERCEL_TOKEN no .env.local; VERCEL_TIME opcional, slug do time)
//      npm run publicar:demo -- --publico   ABERTO para qualquer pessoa com o link (decisão do
//      Marcelo em 09/11/2026): desliga a proteção e confere que o endereço principal abre sem login.
//      Só com dados fictícios; a cota diária de IA por usuário (COTA_IA_DIARIA) limita o custo.
import { execFileSync, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PROJETO = 'copiloto-gestao-boomit-demo'
const PUBLICO = process.argv.includes('--publico')
const { VERCEL_TOKEN, VERCEL_TIME, VITE_MODO_DEMO, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env
if (!VERCEL_TOKEN) throw new Error('Falta VERCEL_TOKEN no .env.local (vercel.com › Account Settings › Tokens)')
if (VITE_MODO_DEMO !== 'true') throw new Error('Este script publica só a demonstração (VITE_MODO_DEMO=true)')
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY')

async function api(metodo, caminho, corpo) {
  const sep = caminho.includes('?') ? '&' : '?'
  const r = await fetch(`https://api.vercel.com${caminho}${sep}teamId=${time.id}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const json = r.status === 204 ? {} : await r.json()
  return { status: r.status, json }
}

// Time: o indicado em VERCEL_TIME ou o único ao qual o token tem acesso.
const autorizacao = { Authorization: `Bearer ${VERCEL_TOKEN}` }
const times = await fetch('https://api.vercel.com/v2/teams', { headers: autorizacao }).then((r) => r.json())
const lista = times.teams ?? []
let time = VERCEL_TIME ? lista.find((t) => t.slug === VERCEL_TIME || t.id === VERCEL_TIME) : lista.length === 1 ? lista[0] : null
if (!time) {
  // Token com escopo de um time só não lista times nem lê a conta: o próprio projeto diz o time.
  const p = await fetch(`https://api.vercel.com/v9/projects/${PROJETO}`, { headers: autorizacao }).then((r) => r.json())
  if (p.accountId) time = { id: p.accountId, slug: VERCEL_TIME || p.accountId }
}
if (!time) throw new Error(`Defina VERCEL_TIME no .env.local com o slug do time (${lista.map((t) => t.slug).join(', ') || 'nenhum time encontrado'})`)
console.log(`Time Vercel: ${time.slug}`)

// 1. Projeto com proteção ligada
let projeto = await api('GET', `/v9/projects/${PROJETO}`)
if (projeto.status === 404) projeto = await api('POST', '/v11/projects', { name: PROJETO, framework: null })
if (projeto.status >= 300) throw new Error(`Projeto Vercel: ${projeto.json.error?.message ?? projeto.status}`)
// Proteção em TODOS os endereços ("all"). A padrão ("Standard") deixou o endereço principal de
// produção aberto no teste de 04/11/2026, e a Vercel cria esse endereço mesmo com --target=preview.
if (PUBLICO) {
  if (projeto.json.ssoProtection) {
    const p = await api('PATCH', `/v9/projects/${projeto.json.id}`, { ssoProtection: null })
    if (p.status >= 300) throw new Error(`Não foi possível desligar a proteção: ${p.json.error?.message ?? p.status}`)
  }
  console.log(`Projeto ${PROJETO}: ABERTO para qualquer pessoa com o link`)
} else {
  if (projeto.json.ssoProtection?.deploymentType !== 'all') {
    const p = await api('PATCH', `/v9/projects/${projeto.json.id}`, { ssoProtection: { deploymentType: 'all' } })
    if (p.status >= 300) throw new Error(`Não foi possível ligar a proteção: ${p.json.error?.message ?? p.status}`)
  }
  console.log(`Projeto ${PROJETO}: proteção de acesso ligada`)
}

// O token nunca vai na linha de comando (apareceria em mensagens de erro e na lista de processos).
const rodar = (cmd, args) => {
  const opcoes = { cwd: RAIZ, stdio: 'inherit' }
  return process.platform === 'win32' ? execSync([cmd, ...args.map((a) => `"${a}"`)].join(' '), opcoes) : execFileSync(cmd, args, opcoes)
}

// 2. Build local
rodar('npx', ['vite', 'build'])
const DIST = path.join(RAIZ, 'dist')
copyFileSync(path.join(RAIZ, 'vercel.json'), path.join(DIST, 'vercel.json'))

// 3. Publicação de PRÉ-VISUALIZAÇÃO pela API (sem o CLI, que exige ler a conta do usuário e não
//    funciona com token restrito a um time): envia cada arquivo e cria a publicação sem "target".
const arquivos = readdirSync(DIST, { recursive: true }).map(String).filter((f) => statSync(path.join(DIST, f)).isFile())
const enviados = []
for (const relativo of arquivos) {
  const conteudo = readFileSync(path.join(DIST, relativo))
  const sha = createHash('sha1').update(conteudo).digest('hex')
  const r = await fetch(`https://api.vercel.com/v2/files?teamId=${time.id}`, {
    method: 'POST',
    headers: { ...autorizacao, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha, 'Content-Length': String(conteudo.length) },
    body: conteudo,
  })
  if (r.status >= 300) throw new Error(`Envio de ${relativo}: HTTP ${r.status}`)
  enviados.push({ file: relativo.split(path.sep).join('/'), sha, size: conteudo.length })
}
console.log(`${enviados.length} arquivos enviados`)
const criada = await api('POST', '/v13/deployments', { name: PROJETO, project: projeto.json.id, files: enviados, projectSettings: { framework: null } })
if (criada.status >= 300) throw new Error(`Criar publicação: ${criada.json.error?.message ?? criada.status}`)
let publicacao = criada.json
for (let i = 0; i < 60 && !['READY', 'ERROR', 'CANCELED'].includes(publicacao.readyState); i++) {
  await new Promise((r) => setTimeout(r, 3000))
  publicacao = (await api('GET', `/v13/deployments/${criada.json.id}`)).json
}
if (publicacao.readyState !== 'READY') throw new Error(`Publicação terminou em ${publicacao.readyState}`)
const url = `https://${publicacao.url}`
const PRINCIPAL = `${PROJETO}.vercel.app`

const pedeLogin = async (e) => {
  const r = await fetch(`${e}?t=${Date.now()}`, { redirect: 'manual' })
  const protegido = r.status === 401 || (r.status >= 300 && r.status < 400 && /vercel\.com\/(sso|login)/.test(r.headers.get('location') ?? ''))
  console.log(`  ${e} → HTTP ${r.status}${protegido ? ' (pede login)' : ' (ABERTO)'}`)
  return protegido
}

// 4. Sem login, os endereços da publicação têm de pedir autenticação (antes de assumir o principal)
const enderecos = [...new Set([url, ...(publicacao.alias ?? []).map((a) => `https://${a}`)])]
const abertos = []
for (const e of enderecos) if (!(await pedeLogin(e))) abertos.push(e)
if (abertos.length && !PUBLICO) {
  if (publicacao.id) await api('DELETE', `/v13/deployments/${publicacao.id}`)
  throw new Error(`Publicação apagada: abriu sem login em ${abertos.join(', ')}.`)
}

// 5. O endereço principal passa a apontar para esta publicação (uma pré-visualização não o
//    assume sozinha; sem isso ele continuaria servindo a versão anterior).
const alias = await api('POST', `/v2/deployments/${publicacao.id}/aliases`, { alias: PRINCIPAL })
if (alias.status >= 300) throw new Error(`Não foi possível apontar ${PRINCIPAL}: ${alias.json.error?.message ?? alias.status}`)
const principalProtegido = await pedeLogin(`https://${PRINCIPAL}`)
if (PUBLICO && principalProtegido) throw new Error(`${PRINCIPAL} ainda pede login: a proteção não foi desligada.`)
if (!PUBLICO && !principalProtegido) {
  throw new Error(`${PRINCIPAL} abriu sem login depois de apontado. Verifique a proteção do projeto na Vercel agora.`)
}
console.log(`\nPublicado ${PUBLICO ? 'ABERTO (qualquer pessoa com o link)' : 'com proteção de acesso'}.\nhttps://${PRINCIPAL}  (publicação ${url})`)
