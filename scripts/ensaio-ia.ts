#!/usr/bin/env node
// Ensaio do motor com o modelo REAL (custa alguns centavos), sem gravar nada no banco.
// Entra como a persona Marina (fictícia), carrega o contexto da Ana com o JWT dela (RLS) e roda
// prepararSituacao para um relato comum e um sensível.
// Uso: npm run ensaio:ia
import { createClient } from '@supabase/supabase-js'
import { carregarContextoDaPessoa } from '../supabase/functions/_shared/adaptadores/boomit/carregar.ts'
import { ClienteAnthropic } from '../supabase/functions/_shared/motor/anthropic.ts'
import { estimarCusto } from '../supabase/functions/_shared/motor/modelo.ts'
import { prepararSituacao } from '../supabase/functions/_shared/motor/preparar.ts'
import type { Database } from '../supabase/functions/_shared/tipos/banco.ts'

const e = process.env
for (const n of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_DEMO_SENHA', 'ANTHROPIC_API_KEY', 'MODELO_PRINCIPAL', 'MODELO_RAPIDO']) {
  if (!e[n]) throw new Error(`Falta ${n} no .env.local`)
}

const db = createClient<Database>(e.SUPABASE_URL!, e.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
const login = await db.auth.signInWithPassword({ email: 'marina.costa@exemplotech.com', password: e.VITE_DEMO_SENHA! })
if (login.error) throw new Error(`login: ${login.error.message}`)

const { data: ana } = await db.from('colaborador').select('id').eq('email', 'ana.faria@exemplotech.com').single()
const contexto = await carregarContextoDaPessoa(db, ana!.id)
if (!contexto) throw new Error('Ana fora da visão da Marina')
console.log(`Contexto: ${contexto.itens.length} itens (RLS da Marina)`)

const cliente = new ClienteAnthropic(e.ANTHROPIC_API_KEY!)
const modelos = { principal: e.MODELO_PRINCIPAL!, rapido: e.MODELO_RAPIDO! }

for (const relato of [
  'Duas entregas fora do prazo combinado na última quinzena.',
  'A Ana me contou que um cliente tem feito comentários de cunho sexual com ela nas reuniões.',
]) {
  console.log(`\n=== Relato: ${relato}`)
  const r = await prepararSituacao({ relato, itens: contexto.itens, cliente, modelos })
  for (const c of r.chamadas) {
    console.log(`  ${c.finalidade}: ${c.uso.modelo} · ${c.uso.tokens_entrada}+${c.uso.cache_leitura + c.uso.cache_escrita} entrada (cache) · ${c.uso.tokens_saida} saída · ${c.uso.latencia_ms} ms · US$ ${estimarCusto(c.uso)}`)
  }
  if (r.tipo === 'encaminhamento') {
    console.log(`  → ENCAMINHAMENTO (${r.categoria}): ${r.motivo}`)
    continue
  }
  const p = r.plano
  console.log(`  → PLANO · frente ${r.classificacao.frente} · alertas: ${r.alertas.join(', ') || 'nenhum'}`)
  console.log(`  Resumo: ${p.resumo_situacao}`)
  console.log(`  Fatos confirmados: ${p.fatos_confirmados.length} (todos com fonte: ${p.fatos_confirmados.every((f) => f.fonte_ids.length > 0)})`)
  for (const f of p.fatos_confirmados) console.log(`    - ${f.texto} [${f.fonte_ids.map((id) => p.referencias.find((x) => x.fonte_id === id)?.apelido).join(', ')}]`)
  console.log(`  A confirmar: ${p.fatos_a_confirmar.length} · Hipóteses: ${p.hipoteses.length} · Perguntas: ${p.perguntas_sugeridas.length} · Combinados: ${p.combinados_propostos.length}`)
  console.log(`  Referências: ${p.referencias.map((x) => `${x.apelido} ${x.rotulo}`).join(' | ')}`)
  console.log(`  Abertura: ${p.abordagem.abertura}`)
}
