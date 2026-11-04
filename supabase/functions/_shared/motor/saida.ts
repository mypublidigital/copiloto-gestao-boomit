// Schemas de saída do motor (docs/03 §4 e §5). Fonte única: o zod valida e gera o JSON Schema
// que vai para a API em output_config.format (saída estruturada).
import { z } from 'zod'

const texto = z.string()

// ---------- classificação (modelo rápido) ----------

export const CATEGORIAS_SENSIVEIS = [
  'assedio',
  'discriminacao',
  'violencia_ou_ameaca',
  'risco_saude_integridade',
  'ilegalidade_ou_fraude',
  'denuncia_envolvendo_lideranca',
] as const

export const classificacaoSchema = z.strictObject({
  sensivel: z.boolean(),
  categoria_sensivel: z.enum([...CATEGORIAS_SENSIVEIS, 'nenhuma']),
  motivo_sensivel: texto,
  frente: z.enum(['desempenho', 'desenvolvimento', 'comportamento', 'organizacao', 'crises', 'lideranca']),
  informacoes_faltantes: z.array(texto),
})
export type Classificacao = z.infer<typeof classificacaoSchema>

// ---------- plano de preparação ----------

export const planoSchema = z.strictObject({
  resumo_situacao: texto,
  fatos_confirmados: z.array(z.strictObject({ texto, fonte_ids: z.array(texto) })),
  fatos_a_confirmar: z.array(z.strictObject({ texto, por_que_importa: texto })),
  hipoteses: z.array(z.strictObject({ texto, base: z.array(texto), como_testar_na_conversa: texto })),
  perguntas_sugeridas: z.array(texto),
  abordagem: z.strictObject({ abertura: texto, pontos_chave: z.array(texto), evitar: z.array(texto) }),
  riscos: z.array(texto),
  combinados_propostos: z.array(
    z.strictObject({
      descricao: texto,
      responsavel: z.enum(['lider', 'colaborador', 'outro']),
      prazo_sugerido_dias: z.number(),
      evidencia_esperada: texto,
    }),
  ),
  encaminhamento: z.strictObject({ necessario: z.boolean(), motivo: texto, canal: z.enum(['rh', 'juridico', 'etica', 'nenhum']) }),
  referencias: z.array(z.strictObject({ fonte_id: texto, rotulo: texto })),
})
export type Plano = z.infer<typeof planoSchema>

// ---------- debrief da simulação (5 critérios, sem nota) ----------

const criterio = z.strictObject({
  avaliacao: z.enum(['observado', 'parcial', 'ausente']),
  trecho: texto,
  sugestao: texto,
})

export const CRITERIOS_DEBRIEF = ['escuta', 'especificidade', 'exploracao_causas', 'clareza_combinado', 'tom'] as const

export const debriefSchema = z.strictObject({
  criterios: z.strictObject({
    escuta: criterio,
    especificidade: criterio,
    exploracao_causas: criterio,
    clareza_combinado: criterio,
    tom: criterio,
  }),
  ponto_forte: texto,
  proximo_passo: texto,
})
export type Debrief = z.infer<typeof debriefSchema>

/** JSON Schema para output_config.format (sem a chave $schema, que a API não precisa). */
export function jsonSchemaDe(schema: z.ZodType): Record<string, unknown> {
  const gerado = { ...(z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>) }
  delete gerado.$schema
  return gerado
}
