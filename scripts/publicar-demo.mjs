#!/usr/bin/env node
// Publica o front de DEMONSTRAÇÃO na Vercel (conta da Leadrix), apontando para o Supabase de
// desenvolvimento. O build é feito aqui, com as variáveis VITE_* do .env.local; a Vercel só
// recebe os arquivos estáticos de dist/ (nenhuma variável fica guardada na Vercel).
// Uso: npm run publicar:demo   (precisa de VERCEL_TOKEN no .env.local)
import { execFileSync, execSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const { VERCEL_TOKEN, VITE_MODO_DEMO, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env
if (!VERCEL_TOKEN) throw new Error('Falta VERCEL_TOKEN no .env.local (vercel.com › Account Settings › Tokens)')
if (VITE_MODO_DEMO !== 'true') throw new Error('Este script publica só a demonstração (VITE_MODO_DEMO=true)')
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY')

const rodar = (cmd, args) =>
  process.platform === 'win32'
    ? execSync([cmd, ...args.map((a) => `"${a}"`)].join(' '), { cwd: RAIZ, stdio: 'inherit' })
    : execFileSync(cmd, args, { cwd: RAIZ, stdio: 'inherit' })

rodar('npx', ['vite', 'build'])
// Rotas do React Router: qualquer caminho serve o index.html.
copyFileSync(path.join(RAIZ, 'vercel.json'), path.join(RAIZ, 'dist', 'vercel.json'))
rodar('npx', ['vercel', 'deploy', 'dist', '--prod', '--yes', `--token=${VERCEL_TOKEN}`, '--name=copiloto-gestao-boomit-demo'])
