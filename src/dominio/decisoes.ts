// Apoio à decisão (inclusão de 08/11/2026): tipos da análise gravada em decisao.analise e
// validação na leitura (o banco guarda JSON; a tela só confia no que passa aqui).
import { z } from 'zod'

const texto = z.string()

export const analiseGravadaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('encaminhamento'), motivo: texto, canais: z.record(z.string(), z.string()).optional() }),
  z.object({
    tipo: z.literal('analise'),
    reformulacao: texto,
    criterios: z.array(z.object({ criterio: texto, peso: z.number(), por_que: texto })),
    alternativas: z.array(
      z.object({
        opcao: texto,
        descricao: texto,
        pros: z.array(texto),
        contras: z.array(texto),
        riscos: z.array(texto),
        reversibilidade: z.enum(['facil', 'media', 'dificil']),
        notas: z.array(z.object({ criterio: texto, nota: z.number(), justificativa: texto })),
        pontuacao: z.number(),
      }),
    ),
    fatos_considerados: z.array(z.object({ texto, fonte_ids: z.array(texto) })),
    informacoes_faltantes: z.array(z.object({ pergunta: texto, por_que_importa: texto })),
    alcada: z.object({ dentro_da_alcada: z.enum(['sim', 'nao', 'incerto']), justificativa: texto, fonte_ids: z.array(texto) }),
    quem_consultar: z.array(texto),
    impacto_em_pessoas: z.array(texto),
    proximos_passos: z.array(texto),
    sugestao_revisao_dias: z.number(),
    referencias: z.array(z.object({ fonte_id: texto, apelido: texto, rotulo: texto, camada: z.number() })),
    alertas: z.array(texto).default([]),
    gerada_em: texto.optional(),
  }),
])
export type AnaliseGravada = z.infer<typeof analiseGravadaSchema>

// Análises antigas podem trazer apelidos de fonte no texto, como "(F7)": saem na leitura.
const APELIDOS_NO_TEXTO = /\s*\((?:F\d+(?:\s*[,e]\s*)?)+\)/g
// "(dado do relato, F9)" → "(dado do relato)"
const APELIDO_NO_FIM_DE_PARENTESE = /(?:,\s*|\s+)F\d+(?=\))/g

export function lerAnalise(json: unknown): AnaliseGravada | null {
  const limpo: unknown = json == null ? json : JSON.parse(JSON.stringify(json).replace(APELIDOS_NO_TEXTO, '').replace(APELIDO_NO_FIM_DE_PARENTESE, ''))
  const r = analiseGravadaSchema.safeParse(limpo)
  return r.success ? r.data : null
}

export type StatusDecisao = 'em_analise' | 'decidida' | 'revisada' | 'cancelada'
export const ROTULO_STATUS_DECISAO: Record<StatusDecisao, string> = { em_analise: 'Em análise', decidida: 'Decidida', revisada: 'Revisada', cancelada: 'Cancelada' }
export const ROTULO_REVERSIBILIDADE = { facil: 'Fácil de desfazer', media: 'Desfazer custa algo', dificil: 'Difícil de desfazer' } as const
export const ROTULO_ALCADA = { sim: 'Dentro da sua alçada', nao: 'Fora da sua alçada', incerto: 'Alçada a confirmar' } as const

/** Recalcula a pontuação com pesos ajustados pelo líder (mesma regra do motor). */
export function pontuar(alternativa: { notas: { criterio: string; nota: number }[] }, pesos: { criterio: string; peso: number }[]): number {
  const total = pesos.reduce((s, p) => s + p.peso, 0)
  if (!total) return 0
  const n = (c: string) => alternativa.notas.find((x) => x.criterio.trim().toLowerCase() === c.trim().toLowerCase())?.nota ?? 3
  return Math.round((pesos.reduce((s, p) => s + p.peso * n(p.criterio), 0) / total) * 10) / 10
}
