#!/usr/bin/env node
// Grava no Supabase os segredos que as Edge Functions de IA precisam, lendo do .env.local.
// Não exibe nenhum valor. Funciona em PowerShell, cmd ou bash:  npm run db:segredos
import { execFileSync, execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const NOMES = ['ANTHROPIC_API_KEY', 'MODELO_PRINCIPAL', 'MODELO_RAPIDO', 'MODELO_AVALIACAO']
// E-mail (régua e insights): vão se estiverem preenchidos. Sem eles, os e-mails ficam na caixa de saída do app.
const OPCIONAIS = ['EMAIL_API_KEY', 'EMAIL_REMETENTE', 'EMAIL_DESTINO_TESTE']

const env = Object.fromEntries(
  readFileSync(path.join(RAIZ, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, '')]),
)

const faltando = NOMES.filter((n) => !env[n])
if (faltando.length) {
  console.error(`Preencha no .env.local: ${faltando.join(', ')}`)
  process.exit(1)
}
if (!env.SUPABASE_PROJECT_REF || !env.SUPABASE_ACCESS_TOKEN) {
  console.error('Faltam SUPABASE_PROJECT_REF ou SUPABASE_ACCESS_TOKEN no .env.local')
  process.exit(1)
}

// Arquivo temporário só com estas variáveis, apagado no fim mesmo se der erro.
const pasta = mkdtempSync(path.join(tmpdir(), 'segredos-'))
const arquivo = path.join(pasta, 'funcoes.env')
try {
  const gravar = [...NOMES, ...OPCIONAIS.filter((n) => env[n])]
  writeFileSync(arquivo, gravar.map((n) => `${n}=${env[n]}`).join('\n') + '\n', { mode: 0o600 })
  console.log(`Gravando (sem exibir valores): ${gravar.join(', ')}`)
  const opcoes = {
    cwd: RAIZ,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN },
  }
  const args = ['supabase', 'secrets', 'set', '--env-file', arquivo, `--remote=${env.SUPABASE_PROJECT_REF}`, '--yes']
  // No Windows o npx é um .cmd e precisa de shell: monta o comando já com aspas
  // (passar a lista de argumentos com shell: true é descontinuado no Node).
  if (process.platform === 'win32') execSync(`npx ${args.map((a) => `"${a}"`).join(' ')}`, opcoes)
  else execFileSync('npx', args, opcoes)
  console.log(`Segredos gravados no Supabase: ${NOMES.join(', ')}`)
} finally {
  rmSync(pasta, { recursive: true, force: true })
}
