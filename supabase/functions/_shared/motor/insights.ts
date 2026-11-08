// Insights semanais (inclusão de 08/11/2026). Os agentes (regras determinísticas, fora do motor)
// leem a semana e levantam SINAIS; o motor pede ao modelo um resumo e recomendações ativas
// citando esses sinais, e verifica: recomendação sem sinal ou fato válido sai; termo proibido sai.
// Sem modelo (ou se ele falhar), insightsDeterministicos monta o resumo só com os sinais.
import { z } from 'zod'
import * as prompt from '../prompts/insights.ts'
import { CAMADAS, type ItemDeContexto } from './contexto.ts'
import { GUARDRAILS, termosProibidos } from './guardrails.ts'
import type { ClienteModelo, Uso } from './modelo.ts'
import { montarPacote } from './pacote.ts'

const texto = z.string()
const PRIORIDADES = ['alta', 'media', 'baixa'] as const
export type Prioridade = (typeof PRIORIDADES)[number]

export const insightsSchema = z.strictObject({
  resumo_da_semana: texto,
  destaques: z.array(z.strictObject({ texto, fonte_ids: z.array(texto) })),
  recomendacoes: z.array(
    z.strictObject({ titulo: texto, acao: texto, por_que: texto, prioridade: z.enum(PRIORIDADES), fonte_ids: z.array(texto), prazo_sugerido_dias: z.number() }),
  ),
  pergunta_reflexao: texto,
})

/** Sinal levantado por um agente: um fato da semana que pede atenção, com a ação sugerida. */
export interface SinalDaSemana {
  fonte_id: string
  agente: string
  titulo: string
  detalhe: string
  prioridade: Prioridade
  acao_sugerida: string
  /** Caminho no app para agir (opcional). */
  link?: string
}

export interface Recomendacao {
  titulo: string
  acao: string
  por_que: string
  prioridade: Prioridade
  fonte_ids: string[]
  prazo_sugerido_dias: number
  link?: string
}

export interface InsightsVerificados {
  resumo_da_semana: string
  destaques: { texto: string; fonte_ids: string[] }[]
  recomendacoes: Recomendacao[]
  pergunta_reflexao: string
  sinais: SinalDaSemana[]
  gerado_por: 'modelo' | 'regras'
}

const ORDEM: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 }

export function insightsDeterministicos(sinais: SinalDaSemana[], fatosDaSemana: ItemDeContexto[] = []): InsightsVerificados {
  const ordenados = [...sinais].sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade])
  const altas = ordenados.filter((s) => s.prioridade === 'alta').length
  return {
    resumo_da_semana: sinais.length
      ? `Os agentes encontraram ${sinais.length} ponto(s) de atenção na sua rotina de gestão${altas ? `, ${altas} com prioridade alta` : ''}.`
      : 'Semana tranquila: nenhum ponto de atenção na sua rotina de gestão.',
    destaques: fatosDaSemana.slice(0, 5).map((f) => ({ texto: f.rotulo, fonte_ids: [f.fonte_id] })),
    recomendacoes: ordenados.slice(0, 5).map((s) => ({
      titulo: s.titulo,
      acao: s.acao_sugerida,
      por_que: s.detalhe,
      prioridade: s.prioridade,
      fonte_ids: [s.fonte_id],
      prazo_sugerido_dias: s.prioridade === 'alta' ? 2 : 7,
      link: s.link,
    })),
    pergunta_reflexao: 'Que conversa você tem adiado e que faria diferença para a equipe na próxima semana?',
    sinais,
    gerado_por: 'regras',
  }
}

export async function gerarInsights(e: {
  sinais: SinalDaSemana[]
  /** Fatos da semana (agenda realizada, combinados cumpridos, registros), já filtrados pela RLS. */
  fatos: ItemDeContexto[]
  cliente: ClienteModelo
  modelo: string
}): Promise<{ insights: InsightsVerificados; alertas: string[]; uso: Uso | null; versao_prompt: string; fontes_ids: string[] }> {
  const itensSinais: ItemDeContexto[] = e.sinais.map((s) => ({
    fonte_id: s.fonte_id,
    rotulo: `Sinal (${s.agente}, prioridade ${s.prioridade}): ${s.titulo}`,
    camada: CAMADAS.historico,
    conteudo: `${s.detalhe}\nAção sugerida pelo agente: ${s.acao_sugerida}`,
    data: null,
  }))
  const pacote = montarPacote([...itensSinais, ...e.fatos.map((f) => ({ ...f, camada: CAMADAS.organizacao }))], { maxCaracteres: 16_000 })
  const fontes_ids = [...pacote.fontes.values()].map((f) => f.fonte_id)
  const porId = new Map(e.sinais.map((s) => [s.fonte_id, s]))

  const r = await e.cliente.gerar({
    finalidade: 'insights_semanais',
    modelo: e.modelo,
    sistema: [
      { texto: `${GUARDRAILS}\n\n${prompt.INSTRUCOES}`, cache: true },
      { texto: `# Contexto\n${pacote.contexto || '(nenhum sinal nesta semana)'}` },
    ],
    mensagens: [{ papel: 'user', texto: prompt.PEDIDO }],
    schema: insightsSchema,
    maxTokens: 6_000,
    esforco: 'low',
  })

  const alertas: string[] = []
  const resolver = (ids: string[]) => [...new Set(ids.map((i) => pacote.fontes.get(i.trim())?.fonte_id).filter((x): x is string => Boolean(x)))]
  const proibido = (t: string) => {
    if (termosProibidos(t).length === 0) return false
    alertas.push('insight_removido_por_regra')
    return true
  }

  const destaques = r.dados.destaques
    .map((d) => ({ texto: d.texto, fonte_ids: resolver(d.fonte_ids) }))
    .filter((d) => {
      if (!d.fonte_ids.length) alertas.push('destaque_sem_fonte')
      return d.fonte_ids.length > 0 && !proibido(d.texto)
    })
    .slice(0, 5)

  const recomendacoes: Recomendacao[] = []
  for (const rec of r.dados.recomendacoes) {
    const ids = resolver(rec.fonte_ids)
    if (!ids.length) {
      alertas.push('recomendacao_sem_sinal')
      continue
    }
    if (proibido(`${rec.titulo} ${rec.acao} ${rec.por_que}`)) continue
    const link = ids.map((i) => porId.get(i)?.link).find(Boolean)
    recomendacoes.push({ ...rec, fonte_ids: ids, prazo_sugerido_dias: Math.min(14, Math.max(1, Math.round(rec.prazo_sugerido_dias || 7))), link })
  }

  // Sinal de prioridade alta que o modelo deixou de fora entra pelas regras: nada urgente se perde.
  for (const s of e.sinais.filter((x) => x.prioridade === 'alta')) {
    if (!recomendacoes.some((rec) => rec.fonte_ids.includes(s.fonte_id))) {
      alertas.push('sinal_alto_incluido_pelas_regras')
      recomendacoes.push({ titulo: s.titulo, acao: s.acao_sugerida, por_que: s.detalhe, prioridade: 'alta', fonte_ids: [s.fonte_id], prazo_sugerido_dias: 2, link: s.link })
    }
  }

  recomendacoes.sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade])

  const resumo = proibido(r.dados.resumo_da_semana) ? insightsDeterministicos(e.sinais).resumo_da_semana : r.dados.resumo_da_semana
  return {
    insights: {
      resumo_da_semana: resumo,
      destaques,
      recomendacoes: recomendacoes.slice(0, 6),
      pergunta_reflexao: proibido(r.dados.pergunta_reflexao) ? '' : r.dados.pergunta_reflexao,
      sinais: e.sinais,
      gerado_por: 'modelo',
    },
    alertas,
    uso: r.uso,
    versao_prompt: prompt.VERSAO,
    fontes_ids,
  }
}
