// Formato de preparacao.conteudo (gravado pela Edge Function preparar-situacao ou pelo líder ao
// salvar uma versão editada). A UI valida com zod antes de exibir.
import { z } from 'zod'

const txt = z.string()

export const fonteSchema = z.object({
  apelido: z.string(),
  fonte_id: z.string(),
  rotulo: z.string(),
  camada: z.number(),
  conteudo: z.string(),
  data: z.string().nullable(),
})
export type Fonte = z.infer<typeof fonteSchema>

export const combinadoPropostoSchema = z.object({
  descricao: txt,
  responsavel: z.enum(['lider', 'colaborador', 'outro']),
  prazo_sugerido_dias: z.number(),
  evidencia_esperada: txt,
})
export type CombinadoProposto = z.infer<typeof combinadoPropostoSchema>

// Campos de cada tipo de preparação (Sprint 3, docs/03 §4).
export const extensaoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('pdi'),
    acoes_desenvolvimento: z.array(z.object({ competencia: txt, acao: txt, apoio: txt, prazo_dias: z.number(), evidencia: txt, fonte_ids: z.array(txt) })),
  }),
  z.object({
    tipo: z.literal('conversa_dificil'),
    interesses_de_cada_parte: z.array(z.object({ parte: txt, interesses: z.array(txt) })),
    pontos_de_acordo_possiveis: z.array(txt),
  }),
  z.object({
    tipo: z.literal('decisao_alcada'),
    dentro_da_alcada: z.enum(['sim', 'nao', 'incerto']),
    justificativa_alcada: txt,
    alcada_fonte_ids: z.array(txt),
    alternativas: z.array(z.object({ opcao: txt, pros: z.array(txt), contras: z.array(txt) })),
    quem_consultar: txt,
    como_comunicar: txt,
  }),
  z.object({
    tipo: z.literal('preparacao_reuniao'),
    pauta: z.array(z.object({ tema: txt, objetivo: txt, minutos: z.number() })),
    perguntas_de_desenvolvimento: z.array(txt),
  }),
])
export type Extensao = z.infer<typeof extensaoSchema>

export type TipoPreparacao = 'feedback' | 'pdi' | 'conversa_dificil' | 'decisao_alcada' | 'preparacao_reuniao'

export const ROTULO_TIPO_PREPARACAO: Record<TipoPreparacao, string> = {
  feedback: 'Feedback',
  pdi: 'PDI',
  conversa_dificil: 'Conversa difícil',
  decisao_alcada: 'Decisão na alçada',
  preparacao_reuniao: '1:1',
}

export const planoSchema = z.object({
  resumo_situacao: txt,
  fatos_confirmados: z.array(z.object({ texto: txt, fonte_ids: z.array(txt) })),
  fatos_a_confirmar: z.array(z.object({ texto: txt, por_que_importa: txt })),
  hipoteses: z.array(z.object({ texto: txt, base: z.array(txt), como_testar_na_conversa: txt })),
  perguntas_sugeridas: z.array(txt),
  abordagem: z.object({ abertura: txt, pontos_chave: z.array(txt), evitar: z.array(txt) }),
  riscos: z.array(txt),
  combinados_propostos: z.array(combinadoPropostoSchema),
  encaminhamento: z.object({ necessario: z.boolean(), motivo: txt, canal: txt }),
  referencias: z.array(z.object({ fonte_id: txt, apelido: txt, rotulo: txt, camada: z.number(), data: z.string().nullable() })),
  extensao: extensaoSchema.optional(),
})
export type Plano = z.infer<typeof planoSchema>

export const conteudoPreparacaoSchema = z.object({
  tipo: z.string(),
  plano: planoSchema,
  alertas: z.array(z.string()).default([]),
  fontes: z.array(fonteSchema).default([]),
  informacoes_faltantes: z.array(z.string()).default([]),
})
export type ConteudoPreparacao = z.infer<typeof conteudoPreparacaoSchema>

export const debriefSchema = z.object({
  criterios: z.record(z.string(), z.object({ avaliacao: z.enum(['observado', 'parcial', 'ausente']), trecho: txt, sugestao: txt })),
  ponto_forte: txt,
  proximo_passo: txt,
})
export type Debrief = z.infer<typeof debriefSchema>

export const ROTULO_CRITERIO: Record<string, { titulo: string; descricao: string }> = {
  escuta: { titulo: 'Escuta', descricao: 'Perguntas abertas, paráfrase, espaço para a outra pessoa' },
  especificidade: { titulo: 'Especificidade', descricao: 'Fatos e exemplos em vez de julgamentos' },
  exploracao_causas: { titulo: 'Exploração de causas', descricao: 'Obstáculos de processo, recursos e do próprio líder' },
  clareza_combinado: { titulo: 'Clareza do combinado', descricao: 'O quê, quem, quando e qual evidência' },
  tom: { titulo: 'Tom', descricao: 'Respeito e firmeza proporcionais à situação' },
}

export const ROTULO_RESPONSAVEL: Record<CombinadoProposto['responsavel'], string> = {
  lider: 'Líder',
  colaborador: 'Colaborador',
  outro: 'Outra pessoa',
}
