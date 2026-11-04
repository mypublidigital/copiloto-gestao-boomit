#!/usr/bin/env node
// Roda os testes pgTAP de supabase/tests/ sem Docker.
//
//   node scripts/testar-rls.mjs local    PGlite em memória: stub do Supabase + migrations + pgTAP mínimo
//   node scripts/testar-rls.mjs remoto   projeto Supabase de desenvolvimento, pgTAP real, pela
//                                        Management API (HTTPS); cada arquivo roda numa transação
//                                        sempre desfeita (não deixa dados).
//                                        Use via: npm run test:rls:remoto (carrega o .env.local sem exibir)
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

// No remoto o teste vai pela Management API (HTTPS), que devolve só o último comando, e o
// pgTAP do Supabase não guarda o texto de cada resultado. Então, dentro da própria transação:
// - INICIO_REMOTO cria o schema tap_remoto com ok/throws_ok/lives_ok que chamam o pgTAP real
//   e anotam a linha TAP numa tabela (o schema vem antes de extensions no search_path);
// - FIM_REMOTO lê essas linhas e LANÇA UM ERRO com elas, o que desfaz a transação inteira
//   (schema auxiliar, extensão e dados do teste não ficam no banco).
const INICIO_REMOTO = `begin;
create extension if not exists pgtap with schema extensions;
create schema tap_remoto;
grant usage on schema tap_remoto to public;
create table tap_remoto.saida (n int primary key, linha text);
grant insert, select on tap_remoto.saida to public;
-- Um registro por número de teste: throws_ok/lives_ok chamam ok() por dentro.
create function tap_remoto.anotar(linha text) returns text language sql as
  $f$ insert into tap_remoto.saida (n, linha)
      values ((regexp_match(linha, '^(?:not )?ok (\\d+)'))[1]::int, linha)
      on conflict (n) do nothing;
      select linha $f$;
create function tap_remoto.ok(boolean, text) returns text language sql as
  $f$ select tap_remoto.anotar(extensions.ok($1, $2)) $f$;
create function tap_remoto.throws_ok(text, char(5), text, text) returns text language sql as
  $f$ select tap_remoto.anotar(extensions.throws_ok($1, $2, $3, $4)) $f$;
create function tap_remoto.lives_ok(text, text) returns text language sql as
  $f$ select tap_remoto.anotar(extensions.lives_ok($1, $2)) $f$;
grant execute on all functions in schema tap_remoto to public;
set local search_path = public, tap_remoto, extensions;`

const FIM_REMOTO = `
reset role;
do $$ declare v_linhas text; v_plano text; begin
  select value::text into v_plano from __tcache__ where label = 'plan' limit 1;
  select string_agg(linha, E'\\n' order by n) into v_linhas from tap_remoto.saida;
  raise exception 'TAP<<%>>', '1..' || coalesce(v_plano, '?') || E'\\n' || coalesce(v_linhas, '');
end $$;`

async function remoto() {
  const { sqlRemoto } = await import('./sql-remoto.mjs')
  let ok = true
  for (const teste of TESTES) {
    const sql = ler(teste)
      .replace(/^create extension if not exists pgtap.*$/im, '')
      .replace(/^begin;$/m, () => INICIO_REMOTO)
      .replace(/^select \* from finish\(\);\s*rollback;\s*$/m, () => FIM_REMOTO)
    try {
      await sqlRemoto(sql)
      console.error(`\n${teste}\n  >>> ERRO: o teste terminou sem devolver resultados`)
      ok = false
    } catch (erro) {
      const tap = /TAP<<([\s\S]*)>>/.exec(erro.message)
      if (!tap?.[1]) {
        console.error(`\n${teste}\n  >>> ERRO: ${erro.message}`)
        ok = false
        continue
      }
      ok = avaliar(teste, tap[1].split('\n')) && ok
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
process.exitCode = passou ? 0 : 1
