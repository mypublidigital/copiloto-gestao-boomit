#!/usr/bin/env node
// Ensaio dos tipos de preparação com o modelo REAL (≈ US$ 0,05 cada), sem gravar no banco.
// Entra como Marina (fictícia), carrega o contexto da Ana com as alçadas dela (RLS) e gera um
// plano de cada tipo. Uso: npm run ensaio:tipos
import { createClient } from '@supabase/supabase-js'
import { carregarContextoDaPessoa } from '../supabase/functions/_shared/adaptadores/boomit/carregar.ts'
import { ClienteAnthropic } from '../supabase/functions/_shared/motor/anthropic.ts'
import { prepararSituacao } from '../supabase/functions/_shared/motor/preparar.ts'
import type { TipoPreparacao } from '../supabase/functions/_shared/motor/saida.ts'
import type { Database } from '../supabase/functions/_shared/tipos/banco.ts'

const e = process.env
const db = createClient<Database>(e.SUPABASE_URL!, e.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
await db.auth.signInWithPassword({ email: 'marina.costa@exemplotech.com', password: e.VITE_DEMO_SENHA! })
const { data: marina } = await db.from('colaborador').select('id').eq('email', 'marina.costa@exemplotech.com').single()
const { data: ana } = await db.from('colaborador').select('id').eq('email', 'ana.faria@exemplotech.com').single()
const contexto = (await carregarContextoDaPessoa(db, ana!.id, marina!.id))!
console.log(`Contexto: ${contexto.itens.length} itens, ${contexto.itens.filter((i) => i.camada === 1).length} alçada(s)`)

const casos: [TipoPreparacao, string][] = [
  ['pdi', 'Vamos revisar o PDI da Ana; quero focar em planejamento das entregas.'],
  ['conversa_dificil', 'Atrito entre a Ana e o analista de suporte sobre quem responde ao cliente nos chamados urgentes.'],
  ['decisao_alcada', 'A Ana pediu para trocar o turno de sexta por segunda na próxima semana.'],
  ['preparacao_reuniao', '1:1 quinzenal com a Ana; da última vez combinamos o plano semanal.'],
]
const cliente = new ClienteAnthropic(e.ANTHROPIC_API_KEY!)
for (const [tipo, relato] of casos) {
  const r = await prepararSituacao({ tipo, relato, itens: contexto.itens, cliente, modelos: { principal: e.MODELO_PRINCIPAL!, rapido: e.MODELO_RAPIDO! } })
  if (r.tipo !== 'plano') {
    console.log(`${tipo}: ENCAMINHAMENTO (${r.categoria})`)
    continue
  }
  const x = r.plano.extensao
  const resumo =
    x?.tipo === 'pdi' ? `${x.acoes_desenvolvimento.length} ações (${x.acoes_desenvolvimento.filter((a) => a.fonte_ids.length).length} com fonte)`
    : x?.tipo === 'conversa_dificil' ? `${x.interesses_de_cada_parte.length} partes, ${x.pontos_de_acordo_possiveis.length} pontos de acordo`
    : x?.tipo === 'decisao_alcada' ? `alçada: ${x.dentro_da_alcada} (${x.alcada_fonte_ids.join(', ') || 'sem fonte'}), ${x.alternativas.length} alternativas`
    : x?.tipo === 'preparacao_reuniao' ? `pauta ${x.pauta.length} temas / ${x.pauta.reduce((s, p) => s + p.minutos, 0)} min, ${x.perguntas_de_desenvolvimento.length} perguntas`
    : 'SEM EXTENSÃO'
  console.log(`${tipo}: ${resumo} · ${r.plano.fatos_confirmados.length} fatos com fonte · alertas: ${r.alertas.join(', ') || 'nenhum'} · ${r.chamadas[1]?.uso.latencia_ms} ms`)
}
