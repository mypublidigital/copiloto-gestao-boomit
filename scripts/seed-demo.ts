#!/usr/bin/env node
// Seed de demonstração (só dados fictícios). Idempotente: pode rodar quantas vezes quiser.
//   1. Conector Boomit em modo mock (mesmo código da Edge Function conector-boomit)
//   2. Hierarquia de fixtures/boomit/hierarquia-exemplo.csv → vinculo_lideranca
//   3. Usuários das personas (src/demo/personas.ts), papéis (membro) e mentoria
// Uso: npm run seed:demo   (carrega o .env.local sem exibir; usa SUPABASE_SERVICE_ROLE_KEY)
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/functions/_shared/tipos/banco.ts'
import { FonteMock } from '../supabase/functions/_shared/adaptadores/boomit/fonte.ts'
import { sincronizar } from '../supabase/functions/_shared/adaptadores/boomit/sincronizar.ts'
import { PERSONAS } from '../src/demo/personas.ts'

const RAIZ = path.resolve(import.meta.dirname, '..')
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_DEMO_SENHA, VITE_MODO_DEMO } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
if (!VITE_DEMO_SENHA) throw new Error('Falta VITE_DEMO_SENHA no .env.local')
if (VITE_MODO_DEMO !== 'true') throw new Error('Seed de demonstração só roda com VITE_MODO_DEMO=true')

const db = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function exigir<T>(r: { data: T; error: { message: string } | null }, contexto: string): T {
  if (r.error) throw new Error(`${contexto}: ${r.error.message}`)
  return r.data
}

// 1. Conector
const resumo = await sincronizar(db, new FonteMock())
console.log(`Conector (mock): ${resumo.status} · ${resumo.registros_lidos} colaboradores · ${resumo.snapshots_novos} snapshots novos · ${resumo.alertas} alertas`)
if (resumo.erros.length) console.log(`  erros: ${resumo.erros.join(' | ')}`)
const empresaId = resumo.empresa_id

const colaboradores = exigir(await db.from('colaborador').select('id, email').eq('empresa_id', empresaId), 'ler colaboradores')
const idPorEmail = new Map(colaboradores.map((c) => [c.email.toLowerCase(), c.id]))
const idDe = (email: string) => {
  const id = idPorEmail.get(email.toLowerCase())
  if (!id) throw new Error(`Colaborador ${email} não está no fixture`)
  return id
}

// 2. Hierarquia
const linhas = readFileSync(path.join(RAIZ, 'fixtures/boomit/hierarquia-exemplo.csv'), 'utf8').trim().split(/\r?\n/).slice(1)
const ativos = exigir(await db.from('vinculo_lideranca').select('lider_id, liderado_id').eq('empresa_id', empresaId).is('fim', null), 'ler hierarquia')
const atual = new Map(ativos.map((v) => [v.liderado_id, v.lider_id]))
let vinculosNovos = 0
for (const linha of linhas) {
  const [liderado, lider] = linha.split(',').map((s) => s.trim())
  if (!liderado || !lider) continue
  const lideradoId = idDe(liderado)
  const liderId = idDe(lider)
  if (atual.get(lideradoId) === liderId) continue
  if (atual.has(lideradoId)) {
    exigir(await db.from('vinculo_lideranca').update({ fim: new Date().toISOString().slice(0, 10) }).eq('liderado_id', lideradoId).is('fim', null), 'encerrar vínculo antigo')
  }
  exigir(await db.from('vinculo_lideranca').insert({ empresa_id: empresaId, lider_id: liderId, liderado_id: lideradoId }), `vincular ${liderado}`)
  vinculosNovos++
}
console.log(`Hierarquia: ${linhas.length} vínculos no CSV, ${vinculosNovos} gravados agora`)

// 3. Usuários, papéis e mentoria
const existentes = new Map<string, string>()
for (let pagina = 1; ; pagina++) {
  const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 })
  if (error) throw new Error(`listar usuários: ${error.message}`)
  for (const u of data.users) if (u.email) existentes.set(u.email.toLowerCase(), u.id)
  if (data.users.length < 200) break
}

for (const p of PERSONAS) {
  let userId = existentes.get(p.email)
  if (userId) {
    const r = await db.auth.admin.updateUserById(userId, { password: VITE_DEMO_SENHA, user_metadata: { nome: p.nome, demo: true } })
    if (r.error) throw new Error(`atualizar ${p.email}: ${r.error.message}`)
  } else {
    const r = await db.auth.admin.createUser({ email: p.email, password: VITE_DEMO_SENHA, email_confirm: true, user_metadata: { nome: p.nome, demo: true } })
    if (r.error || !r.data.user) throw new Error(`criar ${p.email}: ${r.error?.message}`)
    userId = r.data.user.id
  }
  exigir(
    await db.from('membro').upsert(
      { user_id: userId, empresa_id: empresaId, papel: p.papel, colaborador_id: p.colaboradorEmail ? idDe(p.colaboradorEmail) : null },
      { onConflict: 'user_id,empresa_id,papel' },
    ),
    `papel de ${p.nome}`,
  )
  if (p.mentoraEmail) {
    exigir(
      await db.from('mentoria').upsert({ empresa_id: empresaId, mentor_user_id: userId, lider_id: idDe(p.mentoraEmail), ativo: true }, { onConflict: 'mentor_user_id,lider_id' }),
      `mentoria de ${p.nome}`,
    )
  }
  console.log(`Persona ${p.nome} (${p.papel}) pronta`)
}
console.log('Seed de demonstração concluído.')
