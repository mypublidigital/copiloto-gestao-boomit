// Extração de combinados, decisões e temas de trechos de reunião (docs/03 §6).
// Os trechos vão com apelidos T1, T2…; cada item volta apontando o trecho real. Item sem trecho
// válido é descartado (toda extração precisa apontar de onde veio). Nada vira combinado aqui:
// quem chama grava como pendente e o líder revisa (regra inviolável 5).
import { z } from 'zod'
import { instrucoesExtracao, VERSAO } from '../prompts/extracao.ts'
import { GUARDRAILS, termosProibidos } from './guardrails.ts'
import type { ClienteModelo, Uso } from './modelo.ts'

export const extracaoSchema = z.strictObject({
  itens: z.array(
    z.strictObject({
      tipo: z.enum(['combinado', 'decisao', 'tema']),
      descricao: z.string(),
      responsavel_nome: z.string(),
      prazo_data: z.string(),
      prazo_relativo_dias: z.number(),
      trecho: z.string(),
      confianca: z.number(),
    }),
  ),
})

export interface TrechoParaExtrair {
  id: string
  texto: string
  locutor: string | null
}

export interface ItemExtraido {
  tipo: 'combinado' | 'decisao' | 'tema'
  descricao: string
  responsavel_nome: string | null
  prazo: string | null
  prazo_origem: 'texto' | 'relativo' | null
  trecho_id: string
  confianca: number
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
const dataValida = (s: string) => ISO.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`))
const somar = (data: string, dias: number) => {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export async function extrairDeTrechos(e: {
  trechos: TrechoParaExtrair[]
  dataEvento: string | null
  formato: string
  cliente: ClienteModelo
  modelo: string
}): Promise<{ itens: ItemExtraido[]; alertas: string[]; uso: Uso | null; versao_prompt: string }> {
  if (e.trechos.length === 0) return { itens: [], alertas: [], uso: null, versao_prompt: VERSAO }
  const apelidos = new Map(e.trechos.map((t, i) => [`T${i + 1}`, t]))
  const texto = [...apelidos].map(([a, t]) => `[${a}]${t.locutor ? ` ${t.locutor}:` : ''}\n${t.texto}`).join('\n\n')

  const r = await e.cliente.gerar({
    finalidade: 'extracao',
    modelo: e.modelo,
    sistema: [{ texto: `${GUARDRAILS}\n\n${instrucoesExtracao(e.formato, e.dataEvento)}`, cache: true }],
    mensagens: [{ papel: 'user', texto }],
    schema: extracaoSchema,
    maxTokens: 8_000,
    esforco: 'low',
  })

  const alertas: string[] = []
  const itens: ItemExtraido[] = []
  for (const it of r.dados.itens) {
    const trecho = apelidos.get(it.trecho.trim().replace(/^\[|\]$/g, ''))
    if (!trecho) {
      alertas.push(`extracao_sem_trecho:${it.trecho}`)
      continue
    }
    if (termosProibidos(it.descricao).length) {
      alertas.push('extracao_removida_por_regra')
      continue
    }
    let prazo: string | null = null
    let prazo_origem: ItemExtraido['prazo_origem'] = null
    if (dataValida(it.prazo_data)) {
      prazo = it.prazo_data
      prazo_origem = 'texto'
    } else if (it.prazo_relativo_dias > 0 && e.dataEvento && dataValida(e.dataEvento)) {
      prazo = somar(e.dataEvento, Math.round(it.prazo_relativo_dias))
      prazo_origem = 'relativo'
    }
    itens.push({
      tipo: it.tipo,
      descricao: it.descricao.trim(),
      responsavel_nome: it.responsavel_nome.trim() || null,
      prazo: it.tipo === 'combinado' ? prazo : null,
      prazo_origem: it.tipo === 'combinado' ? prazo_origem : null,
      trecho_id: trecho.id,
      confianca: Math.min(1, Math.max(0, Math.round(it.confianca * 100) / 100)),
    })
  }
  return { itens, alertas, uso: r.uso, versao_prompt: VERSAO }
}
