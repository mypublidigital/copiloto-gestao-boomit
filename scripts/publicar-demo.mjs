#!/usr/bin/env node
// Publica o front de DEMONSTRAÇÃO na Vercel, apontando para o Supabase de desenvolvimento,
// COM PROTEÇÃO DE ACESSO (decisão do Marcelo, 04/11/2026):
//   1. garante o projeto no time com Vercel Authentication ligada (ssoProtection);
//   2. build local com as VITE_* do .env.local; a Vercel recebe só dist/ (nenhuma variável fica lá);
//   3. publica como PRÉ-VISUALIZAÇÃO (a proteção padrão cobre esses endereços; o de produção, não);
//   4. abre o link sem login: se não pedir autenticação, APAGA a publicação e falha.
// Uso: npm run publicar:demo   (VERCEL_TOKEN no .env.local; VERCEL_TIME opcional, slug do time)
import { execFileSync, execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PROJETO = 'copiloto-gestao-boomit-demo'
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
const times = await fetch('https://api.vercel.com/v2/teams', { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }).then((r) => r.json())
const lista = times.teams ?? []
const time = VERCEL_TIME ? lista.find((t) => t.slug === VERCEL_TIME) : lista.length === 1 ? lista[0] : null
if (!time) throw new Error(`Defina VERCEL_TIME no .env.local com o slug do time (${lista.map((t) => t.slug).join(', ') || 'nenhum time encontrado'})`)
console.log(`Time Vercel: ${time.slug}`)

// 1. Projeto com proteção ligada
let projeto = await api('GET', `/v9/projects/${PROJETO}`)
if (projeto.status === 404) projeto = await api('POST', '/v11/projects', { name: PROJETO, framework: null })
if (projeto.status >= 300) throw new Error(`Projeto Vercel: ${projeto.json.error?.message ?? projeto.status}`)
// Proteção em TODOS os endereços ("all"). A padrão ("Standard") deixou o endereço principal de
// produção aberto no teste de 04/11/2026, e a Vercel cria esse endereço mesmo com --target=preview.
if (projeto.json.ssoProtection?.deploymentType !== 'all') {
  const p = await api('PATCH', `/v9/projects/${projeto.json.id}`, { ssoProtection: { deploymentType: 'all' } })
  if (p.status >= 300) throw new Error(`Não foi possível ligar a proteção: ${p.json.error?.message ?? p.status}`)
}
console.log(`Projeto ${PROJETO}: proteção de acesso ligada`)

const rodar = (cmd, args, capturar = false) => {
  const opcoes = { cwd: RAIZ, stdio: capturar ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8' }
  return process.platform === 'win32' ? execSync([cmd, ...args.map((a) => `"${a}"`)].join(' '), opcoes) : execFileSync(cmd, args, opcoes)
}

// 2. Build local
rodar('npx', ['vite', 'build'])
copyFileSync(path.join(RAIZ, 'vercel.json'), path.join(RAIZ, 'dist', 'vercel.json'))
mkdirSync(path.join(RAIZ, 'dist', '.vercel'), { recursive: true })
writeFileSync(path.join(RAIZ, 'dist', '.vercel', 'project.json'), JSON.stringify({ projectId: projeto.json.id, orgId: time.id }))

// 3. Publicação de PRÉ-VISUALIZAÇÃO explícita (--target=preview): sem isso, a primeira publicação de
//    um projeto vira produção e ganha o endereço principal, que ficou aberto no primeiro teste.
const saida = String(rodar('npx', ['vercel', 'deploy', 'dist', '--yes', '--target=preview', `--token=${VERCEL_TOKEN}`, `--scope=${time.slug}`], true))
const url = saida.match(/https:\/\/\S+\.vercel\.app/g)?.at(-1)
if (!url) throw new Error('Não encontrei o endereço da publicação na saída da Vercel')

const publicacao = (await api('GET', `/v13/deployments/${new URL(url).hostname}`)).json
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
if (abertos.length) {
  if (publicacao.id) await api('DELETE', `/v13/deployments/${publicacao.id}`)
  throw new Error(`Publicação apagada: abriu sem login em ${abertos.join(', ')}.`)
}

// 5. O endereço principal passa a apontar para esta publicação (uma pré-visualização não o
//    assume sozinha; sem isso ele continuaria servindo a versão anterior).
const alias = await api('POST', `/v2/deployments/${publicacao.id}/aliases`, { alias: PRINCIPAL })
if (alias.status >= 300) throw new Error(`Não foi possível apontar ${PRINCIPAL}: ${alias.json.error?.message ?? alias.status}`)
if (!(await pedeLogin(`https://${PRINCIPAL}`))) {
  throw new Error(`${PRINCIPAL} abriu sem login depois de apontado. Verifique a proteção do projeto na Vercel agora.`)
}
console.log(`\nPublicado com proteção de acesso.\nhttps://${PRINCIPAL}  (publicação ${url})`)
