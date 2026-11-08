#!/usr/bin/env node
// Ensaio do apoio à decisão e dos insights semanais com o modelo REAL, sem gravar no banco.
// Decisão: entra como Marina (fictícia) e usa as alçadas e o contexto da empresa (RLS).
// Insights: uma semana fictícia montada aqui, lida pelos agentes. Uso: npm run ensaio:decisao
import { createClient } from '@supabase/supabase-js'
import { carregarContextoDaDecisao } from '../supabase/functions/_shared/adaptadores/boomit/carregar.ts'
import { fatosDaSemana, lerSemana } from '../supabase/functions/_shared/agentes/semana.ts'
import { ClienteAnthropic } from '../supabase/functions/_shared/motor/anthropic.ts'
import { apoiarDecisao } from '../supabase/functions/_shared/motor/decisao.ts'
import { gerarInsights } from '../supabase/functions/_shared/motor/insights.ts'
import { estimarCusto } from '../supabase/functions/_shared/motor/modelo.ts'
import type { Database } from '../supabase/functions/_shared/tipos/banco.ts'

const e = process.env
const db = createClient<Database>(e.SUPABASE_URL!, e.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
await db.auth.signInWithPassword({ email: 'marina.costa@exemplotech.com', password: e.VITE_DEMO_SENHA! })
const { data: marina } = await db.from('colaborador').select('id, empresa_id').eq('email', 'marina.costa@exemplotech.com').single()
const itens = await carregarContextoDaDecisao(db, marina!.empresa_id, marina!.id, null)
console.log(`Contexto da decisão: ${itens.length} itens, ${itens.filter((i) => i.camada === 1).length} alçada(s)`)
const cliente = new ClienteAnthropic(e.ANTHROPIC_API_KEY!)

const d = await apoiarDecisao({
  titulo: 'Escala de plantão de dezembro',
  pergunta: 'Como dividir o plantão de fim de ano entre as pessoas do suporte sem prejudicar o atendimento?',
  contexto: 'Equipe de 8 pessoas, 3 já pediram férias na segunda quinzena. O volume de chamados cai cerca de 30% em dezembro.',
  opcoes: ['Rodízio semanal', 'Plantão voluntário com folga compensatória'],
  prazo: '2026-11-20',
  itens,
  cliente,
  modelo: e.MODELO_PRINCIPAL!,
})
if (d.tipo === 'encaminhamento') console.log(`Decisão: ENCAMINHAMENTO (${d.motivo})`)
else {
  const a = d.analise
  console.log(`Decisão: ${a.criterios.length} critérios · alternativas: ${a.alternativas.map((x) => `${x.opcao} (${x.pontuacao})`).join(' | ')}`)
  console.log(`  alçada: ${a.alcada.dentro_da_alcada} (${a.alcada.fonte_ids.join(', ') || 'sem fonte'}) · ${a.fatos_considerados.length} fatos com fonte · ${a.informacoes_faltantes.length} a confirmar · revisar em ${a.sugestao_revisao_dias} dias`)
  console.log(`  alertas: ${d.alertas.join(', ') || 'nenhum'} · custo US$ ${estimarCusto(d.uso)} · ${d.uso.latencia_ms} ms`)
}

const agora = new Date()
const dia = (n: number) => new Date(agora.getTime() + n * 86_400_000).toISOString()
const semana = {
  agora,
  equipe: [{ id: 'ana', nome: 'Ana Faria' }, { id: 'joao', nome: 'João Lima' }, { id: 'bia', nome: 'Beatriz Rocha' }],
  compromissos: [
    { id: 'c1', titulo: '1:1 com Ana Faria', tipo: 'um_a_um', inicio: dia(-6), status: 'realizado', colaborador_id: 'ana', realizado_em: dia(-6) },
    { id: 'c2', titulo: 'Feedback sobre prazos (João)', tipo: 'feedback', inicio: dia(-2), status: 'agendado', colaborador_id: 'joao', realizado_em: null },
    { id: 'c3', titulo: 'Conversa de PDI com Carlos', tipo: 'pdi', inicio: dia(1), status: 'agendado', colaborador_id: null, realizado_em: null },
  ],
  combinados: [
    { id: 'k1', descricao: 'Enviar o plano semanal toda segunda', prazo: dia(-3).slice(0, 10), status: 'aberto', colaborador_id: 'ana', concluido_em: null },
    { id: 'k2', descricao: 'Revisar o roteiro de atendimento', prazo: dia(4).slice(0, 10), status: 'aberto', colaborador_id: 'bia', concluido_em: null },
  ],
  decisoes: [{ id: 'd1', titulo: 'Escala de plantão de dezembro', status: 'em_analise', prazo_decisao: dia(2).slice(0, 10), revisar_em: null, decidida_em: null, versao_analise: 1 }],
  revisoesPendentes: 2,
}
const sinais = lerSemana(semana)
const i = await gerarInsights({ sinais, fatos: fatosDaSemana(semana), cliente, modelo: e.MODELO_PRINCIPAL! })
console.log(`\nInsights: ${sinais.length} sinais → ${i.insights.recomendacoes.length} recomendações · alertas: ${i.alertas.join(', ') || 'nenhum'} · custo US$ ${i.uso ? estimarCusto(i.uso) : 0}`)
console.log(`  resumo: ${i.insights.resumo_da_semana}`)
for (const r of i.insights.recomendacoes) console.log(`  [${r.prioridade}] ${r.titulo}: ${r.acao}`)
console.log(`  para pensar: ${i.insights.pergunta_reflexao}`)
