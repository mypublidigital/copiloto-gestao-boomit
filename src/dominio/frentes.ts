// Cálculos das seis frentes de gestão (desempenho, desenvolvimento, comportamento, organização,
// crises, liderança). Funções puras: só contam prazos, registros e cadência — nunca avaliam a
// pessoa nem inferem estado emocional (regras 1 e 9 do CLAUDE.md).

export type Frente = 'desempenho' | 'desenvolvimento' | 'comportamento' | 'organizacao' | 'crises' | 'lideranca'

const DIA = 86_400_000
const instante = (iso: string) => Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso)

/** Dias inteiros entre a data e agora (null sem data). */
export function diasDesde(iso: string | null | undefined, agora = Date.now()): number | null {
  if (!iso) return null
  const t = instante(iso)
  return Number.isNaN(t) ? null : Math.floor((agora - t) / DIA)
}

/** Cumpridos ÷ (cumpridos + não cumpridos), em %. Null se nenhum foi encerrado ainda. */
export function taxaDeCumprimento(combinados: { status: string }[]): number | null {
  const cumpridos = combinados.filter((c) => c.status === 'cumprido').length
  const encerrados = cumpridos + combinados.filter((c) => c.status === 'nao_cumprido').length
  return encerrados ? Math.round((cumpridos / encerrados) * 100) : null
}

/** Data mais recente por pessoa entre os itens dados (registros, compromissos realizados…). */
export function maisRecentePorPessoa<T extends { colaborador_id: string | null }>(itens: T[], data: (i: T) => string | null): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const i of itens) {
    const d = data(i)
    if (!i.colaborador_id || !d) continue
    const atual = mapa.get(i.colaborador_id)
    if (!atual || instante(d) > instante(atual)) mapa.set(i.colaborador_id, d)
  }
  return mapa
}

export interface CompromissoBasico {
  colaborador_id: string | null
  tipo: string
  status: string
  inicio: string
  realizado_em: string | null
}

/** Cadência de 1:1: quem teve 1:1 realizado nos últimos `dias` e quem tem um agendado. */
export function cadenciaDeUmAUm(compromissos: CompromissoBasico[], equipe: string[], agora = Date.now(), dias = 30) {
  const umAUm = compromissos.filter((c) => c.tipo === 'um_a_um')
  const ultimo = maisRecentePorPessoa(umAUm.filter((c) => c.status === 'realizado'), (c) => c.realizado_em ?? c.inicio)
  const agendado = new Set(umAUm.filter((c) => c.status === 'agendado' && instante(c.inicio) >= agora).map((c) => c.colaborador_id))
  const emDia = equipe.filter((id) => {
    const d = diasDesde(ultimo.get(id) ?? null, agora)
    return d !== null && d <= dias
  })
  return {
    emDia,
    agendados: equipe.filter((id) => agendado.has(id)),
    semCadencia: equipe.filter((id) => !emDia.includes(id) && !agendado.has(id)),
    ultimo,
    pct: equipe.length ? Math.round((emDia.length / equipe.length) * 100) : null,
  }
}

/** Quantas pessoas em cada nível de maturidade em IA (1 a 5). */
export function distribuicaoIA(niveis: (number | null | undefined)[]): Record<1 | 2 | 3 | 4 | 5, number> & { sem: number } {
  const r = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, sem: 0 }
  for (const n of niveis) {
    if (n && n >= 1 && n <= 5) r[n as 1 | 2 | 3 | 4 | 5]++
    else r.sem++
  }
  return r
}

/** Média simples ignorando nulos (uma casa decimal). */
export function media(valores: (number | null | undefined)[]): number | null {
  const v = valores.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
}

/** Contagem por chave (área, status, tipo…), em ordem decrescente. */
export function contarPor<T>(itens: T[], chave: (i: T) => string | null | undefined): [string, number][] {
  const m = new Map<string, number>()
  for (const i of itens) {
    const k = chave(i) || 'Sem informação'
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export const ROTULO_REGISTRO: Record<string, string> = {
  feedback: 'Feedback',
  reconhecimento: 'Reconhecimento',
  observacao: 'Observação',
  alinhamento: 'Alinhamento',
  ocorrencia: 'Ocorrência',
}

export const ROTULO_STATUS_ACAO: Record<string, string> = { planejada: 'Planejada', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' }

export const ROTULO_STATUS_SITUACAO: Record<string, string> = {
  rascunho: 'Rascunho',
  preparada: 'Preparada',
  simulada: 'Ensaiada',
  aplicada: 'Conversa feita',
  em_acompanhamento: 'Em acompanhamento',
  encerrada: 'Encerrada',
  encaminhada: 'Encaminhada',
}
