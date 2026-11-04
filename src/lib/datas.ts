// Datas: ISO 8601 no banco; exibição dd/mm/aaaa no fuso America/Sao_Paulo (CLAUDE.md, Convenções).
const FUSO = 'America/Sao_Paulo'

const formatoData = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' })

/** Chave de ordenação: data pura vale como meia-noite em São Paulo. */
export function instante(iso: string): number {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? Date.parse(`${iso}T00:00:00-03:00`) : Date.parse(iso)
}

/** "2026-10-10" → "10/10/2026" (sem deslocar o dia); data-hora → dia em São Paulo. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '—' : formatoData.format(t)
}
