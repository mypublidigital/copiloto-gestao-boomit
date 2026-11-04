#!/usr/bin/env node
// Roda os testes pgTAP de supabase/tests/ sem Docker.
//
//   node scripts/testar-rls.mjs local    PGlite em memória: stub do Supabase + migrations + pgTAP mínimo
//   node scripts/testar-rls.mjs remoto   projeto Supabase de desenvolvimento, pgTAP real; cada arquivo
//                                        roda numa transação desfeita no final (não deixa dados).
//                                        Use via: npm run test:rls:remoto (carrega o .env.local sem exibir)
//
// No modo remoto a conexão vem de SUPABASE_DB_URL (string do pooler em modo sessão, porta 5432,
// em Project Settings › Database › Connection string) ou é montada com SUPABASE_PROJECT_REF,
// SUPABASE_DB_PASSWORD e SUPABASE_DB_POOLER_HOST.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(import.meta.dirname, '..')
const MODO = process.argv[2] ?? 'local'

const ler = (relativo) => readFileSync(path.join(RAIZ, relativo), 'utf8')
const listarSql = (dir) =>
  readdirSync(path.join(RAIZ, dir))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(dir, f))

const MIGRATIONS = listarSql('supabase/migrations')
const TESTES = listarSql('supabase/tests/database')

// Extrai as linhas TAP de todos os resultados retornados por um script com vários comandos.
function linhasTap(resultados) {
  const linhas = []
  for (const r of resultados) {
    for (const linha of r.rows ?? []) {
      for (const valor of Object.values(linha)) {
        if (typeof valor !== 'string') continue
        for (const l of valor.split('\n')) if (/^(ok|not ok|1\.\.|#)/.test(l)) linhas.push(l)
      }
    }
  }
  return linhas
}

function avaliar(arquivo, linhas) {
  const plano = Number(linhas.find((l) => l.startsWith('1..'))?.slice(3) ?? NaN)
  const feitos = linhas.filter((l) => /^(ok|not ok) /.test(l))
  const falhas = feitos.filter((l) => l.startsWith('not ok'))
  console.log(`\n${arquivo}`)
  for (const l of linhas) if (!l.startsWith('1..')) console.log(`  ${l}`)
  const passou = falhas.length === 0 && feitos.length === plano
  console.log(passou ? `  >>> ${feitos.length}/${plano} passaram` : `  >>> FALHOU: ${falhas.length} falha(s), ${feitos.length}/${plano} executados`)
  return passou
}

async function local() {
  const { PGlite } = await import('@electric-sql/pglite')
  const { pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto')
  let ok = true
  for (const teste of TESTES) {
    // Banco novo a cada arquivo: cada teste parte do mesmo estado.
    const db = await PGlite.create({ extensions: { pgcrypto } })
    await db.exec(ler('scripts/rls-local/stub_supabase.sql'))
    for (const m of MIGRATIONS) await db.exec(ler(m))
    await db.exec(ler('scripts/rls-local/grants.sql'))
    await db.exec(ler('scripts/rls-local/pgtap_minimo.sql'))
    await db.exec("set search_path = public, tap")
    // O PGlite não tem a extensão pgTAP: a linha que a cria é trocada pelo pgTAP mínimo já carregado.
    const sql = ler(teste).replace(/^create extension if not exists pgtap.*$/im, '-- pgtap: versão mínima (PGlite)')
    try {
      ok = avaliar(teste, linhasTap(await db.exec(sql))) && ok
    } catch (erro) {
      console.error(`\n${teste}\n  >>> ERRO: ${erro.message}`)
      ok = false
    }
    await db.close()
  }
  return ok
}

function urlRemota() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL
  const { SUPABASE_PROJECT_REF: ref, SUPABASE_DB_PASSWORD: senha, SUPABASE_DB_POOLER_HOST: host } = process.env
  if (!ref || !senha || !host) {
    throw new Error('Defina SUPABASE_DB_URL, ou SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD + SUPABASE_DB_POOLER_HOST, no .env.local')
  }
  return `postgresql://postgres.${ref}:${encodeURIComponent(senha)}@${host}:5432/postgres`
}

async function remoto() {
  const { default: pg } = await import('pg')
  let ok = true
  for (const teste of TESTES) {
    const cliente = new pg.Client({ connectionString: urlRemota(), ssl: { rejectUnauthorized: false } })
    await cliente.connect()
    try {
      await cliente.query('set search_path = public, extensions')
      const resultado = await cliente.query(ler(teste))
      ok = avaliar(teste, linhasTap(Array.isArray(resultado) ? resultado : [resultado])) && ok
    } catch (erro) {
      console.error(`\n${teste}\n  >>> ERRO: ${erro.message}`)
      await cliente.query('rollback').catch(() => {})
      ok = false
    } finally {
      await cliente.end()
    }
  }
  return ok
}

const executar = { local, remoto }[MODO]
if (!executar) {
  console.error(`Modo desconhecido: ${MODO} (use local ou remoto)`)
  process.exit(2)
}
const passou = await executar()
console.log(passou ? '\nTodos os testes de RLS passaram.' : '\nHá testes de RLS falhando.')
process.exit(passou ? 0 : 1)
