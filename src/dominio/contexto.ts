// O que a interface lê de contexto_colaborador.dados e contexto_colaborador_sensivel.dados.
// Validado com zod: o banco guarda JSONB, e a UI não confia no formato sem conferir.
// Espelha a saída do normalizador (supabase/functions/_shared/adaptadores/boomit/normalizador.ts);
// o teste src/dominio/contexto.test.ts garante que as duas pontas continuam compatíveis.
import { z } from 'zod'

const num = z.number().nullable()
const txt = z.string().nullable()

const competencia = z.object({
  competencia: z.string(),
  categoria: z.string(),
  atual: num,
  meta: num,
  gap: num,
  origem: z.enum(['digital_crescimento', 'taticas']),
})

const textoPorCompetencia = z.object({ competencia: z.string(), texto: z.string() })

export const contextoColaboradorSchema = z.object({
  cargo: txt,
  area: txt,
  nivel: txt,
  jornada: z.object({ assessment: txt, focus: txt, personalidade: txt, assessment_respondido_em: txt }).nullable(),
  devolutiva: z.object({ data: txt, concluida: z.boolean() }).nullable(),
  competencias: z.array(competencia),
  gaps_prioritarios: z.array(competencia),
  alinhamento: z.object({ pct: num, rotulo: txt, cultural: num, performance: num, engajamento: num, estrategico: num }).nullable(),
  personalidade: z.object({ tipo: z.string(), apelido: txt, data: txt }).nullable(),
  ia: z.object({ score: num, nivel: num, dimensoes: z.record(z.string(), num) }).nullable(),
  focus: z
    .object({
      mentor: txt,
      analise_tecnica: z.array(textoPorCompetencia),
      analise_comportamental: z.array(textoPorCompetencia),
      sessoes: z.array(z.object({ data: txt, status: txt })),
    })
    .nullable(),
  pdi_boomit: z
    .object({
      gerado_em: txt,
      textos: z.array(textoPorCompetencia),
      pontos_chave: z.array(z.object({ titulo: z.string(), desafio: txt, kpi: txt, de: txt, para: txt, prazo: txt })),
    })
    .nullable(),
  secoes_indisponiveis: z.array(z.string()),
})

export type ContextoColaborador = z.infer<typeof contextoColaboradorSchema>

export const contextoSensivelSchema = z.object({
  ppl: num,
  ppl_atualizado_em: txt,
  performance_tecnica_pct: num,
  quadrante_matriz: txt,
  r3: z.object({ acao: txt, confianca_pct: num, justificativa: txt }).nullable(),
})

export type ContextoSensivel = z.infer<typeof contextoSensivelSchema>

/** Lê o JSON do banco; formato inesperado vira null (a tela mostra "contexto indisponível"). */
export function lerContexto(dados: unknown): ContextoColaborador | null {
  const r = contextoColaboradorSchema.safeParse(dados)
  return r.success ? r.data : null
}

export function lerSensivel(dados: unknown): ContextoSensivel | null {
  const r = contextoSensivelSchema.safeParse(dados)
  return r.success ? r.data : null
}

/** Modelo Centauro de maturidade em IA (docs/referencia §5.10). */
export const NIVEIS_IA: Record<number, { nome: string; descricao: string }> = {
  1: { nome: 'Explorador', descricao: 'Primeiro contato com IA, uso esporádico.' },
  2: { nome: 'Aprendiz', descricao: 'Usa IA em tarefas pontuais, com apoio.' },
  3: { nome: 'Usuário', descricao: 'IA na rotina, com autonomia em casos comuns.' },
  4: { nome: 'Aplicador', descricao: 'Aplica IA de forma estratégica, com ganhos consistentes.' },
  5: { nome: 'Catalisador', descricao: 'Referência interna; capacita pares.' },
}
