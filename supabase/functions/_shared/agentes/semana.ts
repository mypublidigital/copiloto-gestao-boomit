// Agentes da semana (inclusão de 08/11/2026): regras determinísticas que leem a rotina do líder
// e levantam sinais com a ação sugerida. São a "leitura dos acontecimentos" que alimenta os
// insights semanais; o modelo só redige e prioriza a partir deles (motor/insights.ts).
// Nenhum agente avalia pessoas: olham prazos, cadência e registros, nunca desempenho ou emoção.
import type { ItemDeContexto } from '../motor/contexto.ts'
import type { SinalDaSemana } from '../motor/insights.ts'

export interface Semana {
  agora: Date
  equipe: { id: string; nome: string }[]
  compromissos: { id: string; titulo: string; tipo: string; inicio: string; status: string; colaborador_id: string | null; realizado_em: string | null }[]
  combinados: { id: string; descricao: string; prazo: string | null; status: string; colaborador_id: string | null; concluido_em: string | null }[]
  decisoes: { id: string; titulo: string; status: string; prazo_decisao: string | null; revisar_em: string | null; decidida_em: string | null; versao_analise: number }[]
  /** Combinados extraídos de reuniões esperando a revisão do líder. */
  revisoesPendentes: number
}

const DIA = 86_400_000
const dataDe = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
const dias = (de: Date, ate: Date) => Math.floor((ate.getTime() - de.getTime()) / DIA)
const br = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

export function agenteCombinados(s: Semana): SinalDaSemana[] {
  const nome = new Map(s.equipe.map((p) => [p.id, p.nome]))
  const sinais: SinalDaSemana[] = []
  for (const c of s.combinados) {
    if (!['aberto', 'renegociado'].includes(c.status) || !c.prazo) continue
    const faltam = dias(s.agora, dataDe(c.prazo))
    const quem = c.colaborador_id ? ` (${nome.get(c.colaborador_id) ?? 'equipe'})` : ''
    if (faltam < 0) {
      sinais.push({
        fonte_id: `combinado:${c.id}`, agente: 'Combinados', prioridade: 'alta', link: '/combinados',
        titulo: `Combinado vencido${quem}`,
        detalhe: `"${c.descricao}" venceu em ${br(c.prazo)} e segue em aberto.`,
        acao_sugerida: 'Registrar se foi cumprido ou renegociar o prazo com a pessoa.',
      })
    } else if (faltam <= 7) {
      sinais.push({
        fonte_id: `combinado:${c.id}`, agente: 'Combinados', prioridade: 'media', link: '/combinados',
        titulo: `Combinado vence em ${faltam === 0 ? 'hoje' : `${faltam} dia(s)`}${quem}`,
        detalhe: `"${c.descricao}" vence em ${br(c.prazo)}.`,
        acao_sugerida: 'Conferir o andamento antes do prazo.',
      })
    }
  }
  return sinais
}

export function agenteAgenda(s: Semana): SinalDaSemana[] {
  return s.compromissos
    .filter((c) => c.status === 'agendado' && dataDe(c.inicio) < s.agora)
    .map((c) => ({
      fonte_id: `compromisso:${c.id}`, agente: 'Agenda', prioridade: 'media' as const, link: '/agenda',
      titulo: `Registrar como foi: ${c.titulo}`,
      detalhe: `O compromisso de ${br(c.inicio)} ainda está como agendado, sem registro do que aconteceu.`,
      acao_sugerida: 'Marcar como realizado (com um relato curto) ou cancelar.',
    }))
}

/** Pessoas da equipe sem 1:1 realizado nos últimos 30 dias e sem 1:1 agendado. */
export function agenteCadencia(s: Semana, limiteDias = 30): SinalDaSemana[] {
  const sinais: SinalDaSemana[] = []
  for (const p of s.equipe) {
    const umAUm = s.compromissos.filter((c) => c.colaborador_id === p.id && c.tipo === 'um_a_um')
    if (umAUm.some((c) => c.status === 'agendado' && dataDe(c.inicio) >= s.agora)) continue
    const ultimo = umAUm
      .filter((c) => c.status === 'realizado')
      .map((c) => dataDe(c.realizado_em ?? c.inicio))
      .sort((a, b) => b.getTime() - a.getTime())[0]
    const semDias = ultimo ? dias(ultimo, s.agora) : null
    if (semDias !== null && semDias <= limiteDias) continue
    sinais.push({
      fonte_id: `cadencia:${p.id}`, agente: 'Cadência de 1:1', prioridade: semDias === null || semDias > limiteDias * 1.5 ? 'media' : 'baixa', link: '/agenda',
      titulo: `Agendar 1:1 com ${p.nome}`,
      detalhe: semDias === null ? `Nenhum 1:1 com ${p.nome} registrado na agenda.` : `Último 1:1 com ${p.nome} há ${semDias} dias.`,
      acao_sugerida: `Agendar um 1:1 com ${p.nome} na próxima semana.`,
    })
  }
  return sinais
}

export function agenteDecisoes(s: Semana): SinalDaSemana[] {
  const sinais: SinalDaSemana[] = []
  for (const d of s.decisoes) {
    if (d.status === 'em_analise' && d.prazo_decisao) {
      const faltam = dias(s.agora, dataDe(d.prazo_decisao))
      if (faltam <= 2) {
        sinais.push({
          fonte_id: `decisao:${d.id}`, agente: 'Decisões', prioridade: 'alta', link: `/decisoes/${d.id}`,
          titulo: faltam < 0 ? `Decisão atrasada: ${d.titulo}` : `Decidir até ${br(d.prazo_decisao)}: ${d.titulo}`,
          detalhe: faltam < 0 ? `O prazo para decidir era ${br(d.prazo_decisao)}.` : `Faltam ${faltam} dia(s) para o prazo.`,
          acao_sugerida: d.versao_analise ? 'Revisar a análise, registrar a decisão e comunicar quem é afetado.' : 'Pedir a análise de apoio e conversar com quem precisa ser consultado.',
        })
      }
    }
    if (d.status === 'decidida' && d.revisar_em && dataDe(d.revisar_em) <= s.agora) {
      sinais.push({
        fonte_id: `decisao:${d.id}`, agente: 'Decisões', prioridade: 'media', link: `/decisoes/${d.id}`,
        titulo: `Revisar decisão: ${d.titulo}`,
        detalhe: `A revisão estava marcada para ${br(d.revisar_em)}.`,
        acao_sugerida: 'Registrar o resultado: a decisão funcionou? O que muda?',
      })
    }
  }
  return sinais
}

export function agenteRevisoes(s: Semana): SinalDaSemana[] {
  if (s.revisoesPendentes <= 0) return []
  return [{
    fonte_id: 'revisoes:pendentes', agente: 'Reuniões', prioridade: 'media', link: '/fontes',
    titulo: `${s.revisoesPendentes} combinado(s) de reunião para revisar`,
    detalhe: 'Itens extraídos de reuniões aguardam sua confirmação para virar combinado.',
    acao_sugerida: 'Revisar e confirmar (ou descartar) os itens extraídos.',
  }]
}

export const AGENTES = [agenteCombinados, agenteAgenda, agenteCadencia, agenteDecisoes, agenteRevisoes]

export function lerSemana(s: Semana): SinalDaSemana[] {
  return AGENTES.flatMap((a) => a(s))
}

/** Fatos da semana (últimos 7 dias): o que foi realizado, cumprido e decidido. */
export function fatosDaSemana(s: Semana): ItemDeContexto[] {
  const desde = new Date(s.agora.getTime() - 7 * DIA)
  const naSemana = (iso: string | null) => Boolean(iso) && dataDe(iso!) >= desde && dataDe(iso!) <= s.agora
  return [
    ...s.compromissos
      .filter((c) => c.status === 'realizado' && naSemana(c.realizado_em ?? c.inicio))
      .map((c) => ({ fonte_id: `compromisso:${c.id}`, rotulo: `Realizado: ${c.titulo}`, camada: 4 as const, conteudo: `Compromisso realizado em ${br(c.realizado_em ?? c.inicio)}.`, data: (c.realizado_em ?? c.inicio).slice(0, 10) })),
    ...s.combinados
      .filter((c) => c.status === 'cumprido' && naSemana(c.concluido_em))
      .map((c) => ({ fonte_id: `combinado:${c.id}`, rotulo: `Combinado cumprido: ${c.descricao}`, camada: 4 as const, conteudo: `Cumprido em ${br(c.concluido_em!)}.`, data: c.concluido_em })),
    ...s.decisoes
      .filter((d) => d.status === 'decidida' && naSemana(d.decidida_em))
      .map((d) => ({ fonte_id: `decisao:${d.id}`, rotulo: `Decisão tomada: ${d.titulo}`, camada: 4 as const, conteudo: `Decidida em ${br(d.decidida_em!)}.`, data: d.decidida_em!.slice(0, 10) })),
  ]
}
