#!/usr/bin/env node
// Garante que o build de produção (VITE_MODO_DEMO=false) não leva nada do modo demonstração:
// seletor de persona, e-mails das personas, faixa "dados fictícios" nem a senha de demonstração.
// Uso: npm run verificar:producao   (carrega o .env.local sem exibir valores)
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const SAIDA = path.join(RAIZ, 'node_modules/.tmp/build-producao')

rmSync(SAIDA, { recursive: true, force: true })
execFileSync(process.execPath, [path.join(RAIZ, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', SAIDA, '--emptyOutDir', '--logLevel', 'error'], {
  cwd: RAIZ,
  stdio: 'inherit',
  // Variáveis do processo têm prioridade sobre o .env.local no Vite.
  env: { ...process.env, VITE_MODO_DEMO: 'false' },
})

const arquivos = readdirSync(SAIDA, { recursive: true }).map(String).filter((f) => /\.(js|html|css)$/.test(f))
const conteudo = arquivos.map((f) => readFileSync(path.join(SAIDA, f), 'utf8')).join('\n')

const proibidos = [
  ['seletor de persona', 'Ver como:'],
  ['tela de personas', 'Entrar como persona fictícia'],
  ['faixa de demonstração', 'Versão de desenvolvimento para demonstração'],
  ['e-mail de persona', 'marina.costa@exemplotech.com'],
  ['e-mail de persona', 'admin.rh@exemplotech.com'],
]
if (process.env.VITE_DEMO_SENHA) proibidos.push(['senha de demonstração', process.env.VITE_DEMO_SENHA])

let ok = true
for (const [nome, marca] of proibidos) {
  const achou = conteudo.includes(marca)
  // Nunca imprime a marca: uma delas é a senha.
  console.log(`${achou ? 'FALHOU' : 'ok    '}  ${nome} ${achou ? 'presente' : 'ausente'} no build de produção`)
  ok &&= !achou
}
// Produção precisa sinalizar o que falta (registro de 08/11/2026): faixa e página /sobre.
for (const [nome, marca] of [['aviso de implantação pendente', 'ver o que falta'], ['lista do que falta para a produção', 'Integração com a Plataforma Boomit']]) {
  const achou = conteudo.includes(marca)
  console.log(`${achou ? 'ok    ' : 'FALHOU'}  ${nome} ${achou ? 'presente' : 'ausente'} no build de produção`)
  ok &&= achou
}
rmSync(SAIDA, { recursive: true, force: true })
console.log(ok ? '\nBuild de produção limpo.' : '\nO build de produção contém itens do modo demonstração.')
process.exitCode = ok ? 0 : 1
