#!/usr/bin/env node
// Ensaio de ponta a ponta do M6 com o modelo REAL: como Marina (fictícia), sobe as anotações
// fictícias do Gemini, dispara processar-documento, espera e mostra o resultado. O documento
// fica gravado como dado de demonstração. Uso: npm run ensaio:documento
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { carregarContextoDaPessoa } from '../supabase/functions/_shared/adaptadores/boomit/carregar.ts'
import type { Database } from '../supabase/functions/_shared/tipos/banco.ts'

const e = process.env
const db = createClient<Database>(e.SUPABASE_URL!, e.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
const { data: login } = await db.auth.signInWithPassword({ email: 'marina.costa@exemplotech.com', password: e.VITE_DEMO_SENHA! })
const { data: eu } = await db.from('membro').select('empresa_id, colaborador_id').eq('user_id', login.user!.id).eq('papel', 'lider').single()
const { data: ana } = await db.from('colaborador').select('id, nome').eq('email', 'ana.faria@exemplotech.com').single()

const id = crypto.randomUUID()
const caminho = `${eu!.empresa_id}/${id}/anotacoes-gemini-exemplo.md`
const ins = await db.from('documento_fonte').insert({
  id, empresa_id: eu!.empresa_id, lider_id: eu!.colaborador_id, tipo: 'anotacao_reuniao',
  titulo: '1:1 Marina e Ana (anotações fictícias)', data_evento: '2026-11-05', storage_path: caminho, participantes_avisados: true,
})
if (ins.error) throw new Error(ins.error.message)
const arquivo = readFileSync(path.resolve(import.meta.dirname, '../fixtures/reunioes/anotacoes-gemini-exemplo.md'))
const up = await db.storage.from('fontes').upload(caminho, new Blob([arquivo], { type: 'text/markdown' }))
if (up.error) throw new Error(`upload: ${up.error.message}`)

const r = await fetch(`${e.SUPABASE_URL}/functions/v1/processar-documento`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${login.session!.access_token}`, apikey: e.SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
  body: JSON.stringify({ documento_id: id }),
})
console.log('processar-documento:', r.status, await r.text())

let doc
for (let i = 0; i < 40; i++) {
  await new Promise((res) => setTimeout(res, 3000))
  doc = (await db.from('documento_fonte').select('status_processamento, formato, erro').eq('id', id).single()).data
  if (doc?.status_processamento === 'processado' || doc?.status_processamento === 'erro') break
}
console.log('status:', doc)
const trechos = (await db.from('trecho').select('id').eq('documento_id', id)).data ?? []
const pessoas = (await db.from('documento_colaborador').select('confirmado, colaborador:colaborador_id(nome)').eq('documento_id', id)).data ?? []
const extracoes = (await db.from('extracao').select('tipo, conteudo, confianca, trecho_id').eq('documento_id', id)).data ?? []
console.log(`trechos: ${trechos.length} · pessoas sugeridas: ${pessoas.map((p) => p.colaborador?.nome).join(', ')}`)
for (const x of extracoes) {
  const c = x.conteudo as { descricao: string; responsavel_nome: string | null; prazo: string | null; prazo_origem: string | null }
  console.log(`  ${x.tipo}: ${c.descricao} · ${c.responsavel_nome ?? '—'} · prazo ${c.prazo ?? '—'} (${c.prazo_origem ?? '-'}) · conf ${x.confianca} · trecho ${x.trecho_id ? 'ok' : 'FALTA'}`)
}

// Confirma a Ana e confere que os trechos entram no contexto dela (camada 7).
await db.from('documento_colaborador').update({ confirmado: true }).eq('documento_id', id).eq('colaborador_id', ana!.id)
const ctx = await carregarContextoDaPessoa(db, ana!.id, eu!.colaborador_id, 'plano da semana e risco de atraso')
console.log(`contexto da Ana: ${ctx!.itens.filter((i) => i.camada === 7).length} trecho(s) de reunião na camada 7`)
console.log(`documento: /fontes/${id}`)
