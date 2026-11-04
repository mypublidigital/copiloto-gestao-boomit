#!/usr/bin/env node
// Aplica no projeto remoto as migrations de supabase/migrations/ que ainda não foram aplicadas,
// pela Management API (HTTPS). Registra cada uma em supabase_migrations.schema_migrations, a
// mesma tabela do Supabase CLI: depois disso `supabase db push` / `migration list` enxergam o
// mesmo histórico.
//
// Uso: npm run db:aplicar            (aplica as pendentes)
//      npm run db:aplicar -- --listar (só mostra o que está pendente)
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { sqlRemoto } from './sql-remoto.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const DIR = path.join(RAIZ, 'supabase/migrations')
const SO_LISTAR = process.argv.includes('--listar')

const HISTORICO = `
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, statements text[], name text
);`

const literal = (s) => `'${s.replaceAll("'", "''")}'`

const arquivos = readdirSync(DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()
await sqlRemoto(HISTORICO)
const aplicadas = new Set((await sqlRemoto('select version from supabase_migrations.schema_migrations')).map((r) => r.version))
const pendentes = arquivos.filter((f) => !aplicadas.has(f.split('_')[0]))

console.log(`Migrations: ${arquivos.length} no repositório, ${aplicadas.size} aplicadas, ${pendentes.length} pendente(s)`)
for (const f of pendentes) console.log(`  pendente: ${f}`)
if (SO_LISTAR || pendentes.length === 0) process.exit(0)

for (const arquivo of pendentes) {
  const [versao, ...resto] = arquivo.replace(/\.sql$/, '').split('_')
  const sql = readFileSync(path.join(DIR, arquivo), 'utf8')
  // Migration + registro no histórico na mesma transação: ou aplica tudo, ou nada.
  const script = `begin;\n${sql}\n;\ninsert into supabase_migrations.schema_migrations (version, name, statements)
values (${literal(versao)}, ${literal(resto.join('_'))}, array[${literal(sql)}]);\ncommit;`
  process.stdout.write(`Aplicando ${arquivo}... `)
  try {
    await sqlRemoto(script)
    console.log('ok')
  } catch (erro) {
    console.log('ERRO')
    console.error(`  ${erro.message}`)
    process.exit(1)
  }
}
