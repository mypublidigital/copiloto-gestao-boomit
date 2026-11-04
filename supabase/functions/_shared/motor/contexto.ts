// Motor de IA compartilhado — contrato de entrada.
// O motor só conhece contexto por esta interface: nenhum campo, tabela ou nome de origem.
// Ver CLAUDE.md ("Motor compartilhado") e docs/03 §3.

/** Camadas do pacote de contexto, da mais estável (0) à mais específica (8). */
export const CAMADAS = {
  guardrails: 0,
  politicas_e_alcadas: 1,
  lente: 2,
  skill_da_etapa: 3,
  organizacao: 4,
  pessoa: 5,
  historico: 6,
  reunioes_e_mentorias: 7,
  relato: 8,
} as const

export type NomeCamada = keyof typeof CAMADAS
export type NumeroCamada = (typeof CAMADAS)[NomeCamada]

/** Unidade de contexto entregue ao motor. Itens das camadas 4 a 8 são citáveis por `fonte_id`. */
export interface ItemDeContexto {
  /** Identificador estável usado nas citações (`fonte_ids`) da saída. */
  fonte_id: string
  /** Rótulo legível exibido ao líder, por exemplo "Mentoria · 14/10/2026". */
  rotulo: string
  camada: NumeroCamada
  conteudo: string
  /** Data do fato ou documento em ISO 8601, quando houver. */
  data: string | null
}

/** Camadas que nunca são cortadas quando o contexto estoura (docs/03 §3). */
export const CAMADAS_FIXAS: readonly NumeroCamada[] = [0, 1, 2, 3, 8]

export function ehCitavel(item: ItemDeContexto): boolean {
  return item.camada >= CAMADAS.organizacao
}
