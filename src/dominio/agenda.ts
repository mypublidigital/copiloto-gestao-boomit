// Agenda da liderança (inclusão de 08/11/2026): reúne num só lugar o que está agendado e o que
// foi realizado — compromissos, prazos de combinados, conversas aplicadas, reuniões enviadas e
// prazos de decisões —, nas visões dia, semana e mês, com busca. Funções puras (testáveis).
const FUSO = 'America/Sao_Paulo'

export type Visao = 'dia' | 'semana' | 'mes'
export type OrigemEvento = 'compromisso' | 'combinado' | 'conversa' | 'reuniao' | 'decisao'
export type StatusEvento = 'agendado' | 'realizado' | 'cancelado' | 'vencido'

export interface EventoAgenda {
  id: string
  origem: OrigemEvento
  /** Para compromissos: o tipo (um_a_um, feedback…). */
  tipo: string | null
  titulo: string
  /** ISO: data-hora, ou AAAA-MM-DD para eventos de dia inteiro (prazos). */
  inicio: string
  duracaoMin: number | null
  status: StatusEvento
  pessoa: string | null
  pessoaId: string | null
  detalhe: string | null
  link: string
}

export const ROTULO_TIPO_COMPROMISSO: Record<string, string> = {
  um_a_um: '1:1',
  feedback: 'Feedback',
  pdi: 'PDI',
  conversa: 'Conversa',
  reuniao_equipe: 'Reunião de equipe',
  mentoria: 'Mentoria',
  outro: 'Outro',
}

export const ROTULO_ORIGEM: Record<OrigemEvento, string> = {
  compromisso: 'Compromisso',
  combinado: 'Prazo de combinado',
  conversa: 'Conversa aplicada',
  reuniao: 'Reunião enviada',
  decisao: 'Decisão',
}

export const ROTULO_STATUS: Record<StatusEvento, string> = { agendado: 'Agendado', realizado: 'Realizado', cancelado: 'Cancelado', vencido: 'Vencido' }

/** AAAA-MM-DD do instante em São Paulo (data pura fica como está). */
export function diaSP(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

export function horaSP(iso: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

const somar = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const diaDaSemana = (dia: string) => (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7 // 0 = segunda

/** Dias (AAAA-MM-DD) cobertos pela visão. Semana: segunda a domingo. Mês: grade completa de semanas. */
export function diasDaVisao(visao: Visao, referencia: string): string[] {
  if (visao === 'dia') return [referencia]
  if (visao === 'semana') {
    const seg = somar(referencia, -diaDaSemana(referencia))
    return Array.from({ length: 7 }, (_, i) => somar(seg, i))
  }
  const primeiro = `${referencia.slice(0, 7)}-01`
  const inicio = somar(primeiro, -diaDaSemana(primeiro))
  const proximoMes = somar(`${referencia.slice(0, 7)}-28`, 4).slice(0, 7)
  const ultimo = somar(`${proximoMes}-01`, -1)
  const fim = somar(ultimo, 6 - diaDaSemana(ultimo))
  const dias: string[] = []
  for (let d = inicio; d <= fim; d = somar(d, 1)) dias.push(d)
  return dias
}

/** Limites ISO (início inclusivo, fim exclusivo) em São Paulo, para consultar o banco. */
export function limitesDaVisao(visao: Visao, referencia: string): { de: string; ate: string; deDia: string; ateDia: string } {
  const dias = diasDaVisao(visao, referencia)
  const deDia = dias[0]!
  const ateDia = dias[dias.length - 1]!
  return { de: `${deDia}T00:00:00-03:00`, ate: `${somar(ateDia, 1)}T00:00:00-03:00`, deDia, ateDia }
}

/** Anda uma visão para frente ou para trás. */
export function moverReferencia(visao: Visao, referencia: string, passo: 1 | -1): string {
  if (visao === 'dia') return somar(referencia, passo)
  if (visao === 'semana') return somar(referencia, 7 * passo)
  const [a, m] = referencia.split('-').map(Number) as [number, number]
  const total = a * 12 + (m - 1) + passo
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}

export function tituloDaVisao(visao: Visao, referencia: string): string {
  const fmt = (dia: string, op: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...op }).format(new Date(`${dia}T12:00:00Z`))
  if (visao === 'dia') return fmt(referencia, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  if (visao === 'mes') return fmt(referencia, { month: 'long', year: 'numeric' })
  const dias = diasDaVisao('semana', referencia)
  return `${fmt(dias[0]!, { day: '2-digit', month: '2-digit' })} a ${fmt(dias[6]!, { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Busca sem acento e por todas as palavras: título, pessoa, detalhe, tipo e status. */
export function buscarEventos(eventos: EventoAgenda[], busca: string): EventoAgenda[] {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean)
  if (!termos.length) return eventos
  return eventos.filter((e) => {
    const alvo = normalizar(
      [e.titulo, e.pessoa ?? '', e.detalhe ?? '', ROTULO_ORIGEM[e.origem], e.tipo ? (ROTULO_TIPO_COMPROMISSO[e.tipo] ?? e.tipo) : '', ROTULO_STATUS[e.status]].join(' '),
    )
    return termos.every((t) => alvo.includes(t))
  })
}

/** Ordena: dia, depois eventos de dia inteiro, depois por hora. */
export function ordenarEventos(eventos: EventoAgenda[]): EventoAgenda[] {
  const chave = (e: EventoAgenda) => `${diaSP(e.inicio)} ${horaSP(e.inicio) ?? '00:00'}${/^\d{4}-\d{2}-\d{2}$/.test(e.inicio) ? '0' : '1'}`
  return [...eventos].sort((a, b) => chave(a).localeCompare(chave(b)))
}

export function agruparPorDia(eventos: EventoAgenda[]): Map<string, EventoAgenda[]> {
  const mapa = new Map<string, EventoAgenda[]>()
  for (const e of ordenarEventos(eventos)) {
    const d = diaSP(e.inicio)
    mapa.set(d, [...(mapa.get(d) ?? []), e])
  }
  return mapa
}

export function resumoDosEventos(eventos: EventoAgenda[]): Record<StatusEvento, number> {
  const r: Record<StatusEvento, number> = { agendado: 0, realizado: 0, cancelado: 0, vencido: 0 }
  for (const e of eventos) r[e.status]++
  return r
}

/** Compromisso agendado cujo horário já passou: pede o registro de como foi. */
export function pedeRegistro(e: EventoAgenda, agora = new Date()): boolean {
  return e.origem === 'compromisso' && e.status === 'agendado' && Date.parse(e.inicio) < agora.getTime()
}

/** Etapas da régua de lembretes (lembrete.etapa). */
export const ETAPAS: Record<string, string> = {
  prazo: 'Prazo do combinado',
  confirmacao: 'Confirmação do agendamento',
  remarcado: 'Aviso de remarcação',
  vespera: 'Véspera',
  em_breve: '1 hora antes',
  pos_evento: 'Pedido de registro (depois)',
  prazo_d2: '2 dias antes do prazo',
  prazo_d1: '1 dia antes do prazo',
  prazo_hoje: 'No dia do prazo',
  vencido: 'Prazo vencido',
  decisao_prazo: 'Véspera do prazo de decisão',
  decisao_revisao: 'Dia da revisão',
}
