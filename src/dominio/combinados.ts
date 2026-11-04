import type { Database } from '@/tipos/banco'

export type StatusCombinado = Database['public']['Enums']['status_combinado']

export const ROTULO_STATUS_COMBINADO: Record<StatusCombinado, string> = {
  pendente_revisao: 'Pendente de revisão',
  aberto: 'Aberto',
  cumprido: 'Cumprido',
  renegociado: 'Renegociado',
  nao_cumprido: 'Não cumprido',
  cancelado: 'Cancelado',
}

/** Data de hoje (aaaa-mm-dd) no fuso de São Paulo. */
export function hojeSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora)
}

/** Soma dias a uma data aaaa-mm-dd, sem efeito de fuso. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function estaVencido(c: { status: StatusCombinado; prazo: string | null }, hoje = hojeSaoPaulo()): boolean {
  return (c.status === 'aberto' || c.status === 'renegociado') && c.prazo !== null && c.prazo < hoje
}
