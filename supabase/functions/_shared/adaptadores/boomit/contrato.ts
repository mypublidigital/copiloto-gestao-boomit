// Tipos do contrato Boomit → Copiloto v1 (contracts/boomit-export.v1.schema.json).
// Só o que o Copiloto usa; o payload completo fica intacto no snapshot bruto.
// Campos numéricos e datas aceitam string porque a Boomit mistura formatos (R5).

export type NumeroBruto = number | string | null | undefined
export type DataBruta = string | null | undefined

export interface SecaoIndisponivel {
  secao: string
  motivo?: string
}

export interface TextoGerado {
  texto: string
  gerado_em?: DataBruta
}

export interface EmpresaBoomit {
  id: string
  nome_fantasia: string
  setor?: string
  data_ultima_analise?: DataBruta
  maturidade?: { nota?: string; score?: NumeroBruto; rotulo?: string; diagnostico?: string; proxima_etapa?: string }
  pontos_chave?: { metrica: string; meta?: string; desafios?: string[]; risco_pct?: NumeroBruto; risco_justificativa?: string }[]
  estrategias_prioritarias?: { ordem: number; titulo: string; descricao?: string; acoes?: string[] }[]
  alinhamento_medio?: Record<string, NumeroBruto>
  ia?: { score_100?: NumeroBruto; nivel_centauro?: NumeroBruto; nivel_rotulo?: string; eixos?: Record<string, NumeroBruto>; diagnostico?: string; proximo_passo?: string; calculado_em?: DataBruta }
  textos_ia?: Record<string, TextoGerado>
  /** Nunca importado na Fase 1 (minimização). */
  financeiro?: unknown
  secoes_indisponiveis?: SecaoIndisponivel[]
}

export interface CompetenciaComportamental {
  competencia: string
  auto?: NumeroBruto
  meta?: NumeroBruto
  atual?: NumeroBruto
}

export interface CompetenciaTatica {
  competencia: string
  atual?: NumeroBruto
  esperado?: NumeroBruto
}

export interface ColaboradorBoomit {
  id: string
  email: string
  nome: string
  cargo?: string
  area?: string
  diretoria?: string
  nivel?: 'operacional' | 'tatico' | 'estrategico'
  ativo?: boolean
  atualizado_em?: DataBruta
  /** Nunca importados na Fase 1 (minimização). */
  salario?: unknown
  genero?: unknown
  celular?: unknown
  jornada?: { assessment?: string; focus?: string; personalidade?: string; assessment_enviado_em?: DataBruta; assessment_respondido_em?: DataBruta }
  devolutiva?: { data?: DataBruta; concluida?: boolean }
  digital_crescimento?: CompetenciaComportamental[]
  taticas?: CompetenciaTatica[]
  alinhamento?: { pct?: NumeroBruto; rotulo?: string; cultural?: NumeroBruto; performance?: NumeroBruto; engajamento?: NumeroBruto; estrategico?: NumeroBruto }
  personalidade?: { tipo?: string; apelido?: string; data?: DataBruta }
  potencial?: { adaptabilidade?: NumeroBruto; interesse?: NumeroBruto; tempo_meses?: NumeroBruto; esforco?: string }
  perfil_hierarquico?: { operacional_pct?: NumeroBruto; tatico_pct?: NumeroBruto; estrategico_pct?: NumeroBruto; dominante?: string }
  ia?: { score?: NumeroBruto; nivel?: NumeroBruto; fluencia_digital?: NumeroBruto; uso_pratico?: NumeroBruto; prontidao_comportamental?: NumeroBruto; pensamento_analitico?: NumeroBruto; aderencia_contexto?: NumeroBruto }
  focus?: {
    mentor?: { nome?: string; linkedin?: string | null }
    analise_tecnica?: Record<string, string>
    analise_comportamental?: Record<string, string>
    sessoes?: { data?: DataBruta; status?: string; motivo?: string | null }[]
  }
  pdi_boomit?: {
    gerado_em?: DataBruta
    textos?: Record<string, string>
    pontos_chave?: { titulo: string; desafio?: string; kpi?: string; de?: string; para?: string; prazo?: string }[]
  }
  indicadores_sensiveis?: {
    ppl?: NumeroBruto
    ppl_atualizado_em?: DataBruta
    performance_tecnica_pct?: NumeroBruto
    quadrante_matriz?: string
    r3?: { acao?: string; confianca_pct?: NumeroBruto; justificativa?: string }
  }
  secoes_indisponiveis?: SecaoIndisponivel[]
}

export interface PayloadBoomitV1 {
  schema_version: '1.0'
  gerado_em: string
  proximo_cursor?: string | null
  empresa: EmpresaBoomit
  colaboradores: ColaboradorBoomit[]
}
