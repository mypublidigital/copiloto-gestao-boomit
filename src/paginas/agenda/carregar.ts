// Leitura da agenda: tudo pelo JWT do líder (a RLS mostra só o que é dele).
import type { Vinculo } from '@/auth/sessao'
import type { EventoAgenda } from '@/dominio/agenda'
import { hojeSaoPaulo } from '@/dominio/combinados'
import { supabase } from '@/lib/supabase'
import { exigir } from '@/lib/useConsulta'

export interface Periodo {
  de: string
  ate: string
  deDia: string
  ateDia: string
}

export async function carregarEventos(v: Vinculo, p: Periodo): Promise<EventoAgenda[]> {
  if (!v.colaborador_id) return []
  const lider = v.colaborador_id
  const hoje = hojeSaoPaulo()
  const [compromissos, combinados, conversas, reunioes, decisoesPrazo, decisoesTomadas] = await Promise.all([
    supabase.from('compromisso').select('id, tipo, titulo, inicio, duracao_min, status, local, observacao, relato, colaborador_id, colaborador:colaborador_id(nome)').gte('inicio', p.de).lt('inicio', p.ate),
    supabase.from('combinado').select('id, descricao, prazo, status, colaborador_id, colaborador:colaborador_id(nome)').eq('lider_id', lider).in('status', ['aberto', 'renegociado', 'cumprido', 'nao_cumprido']).gte('prazo', p.deDia).lte('prazo', p.ateDia),
    supabase.from('situacao').select('id, titulo, tipo, aplicada_em, colaborador_id, colaborador:colaborador_id(nome)').eq('lider_id', lider).not('aplicada_em', 'is', null).gte('aplicada_em', p.de).lt('aplicada_em', p.ate),
    supabase.from('documento_fonte').select('id, titulo, tipo, data_evento').eq('lider_id', lider).gte('data_evento', p.deDia).lte('data_evento', p.ateDia),
    supabase.from('decisao').select('id, titulo, status, prazo_decisao, colaborador_id, colaborador:colaborador_id(nome)').eq('status', 'em_analise').gte('prazo_decisao', p.deDia).lte('prazo_decisao', p.ateDia),
    supabase.from('decisao').select('id, titulo, opcao_escolhida, decidida_em, colaborador_id, colaborador:colaborador_id(nome)').in('status', ['decidida', 'revisada']).gte('decidida_em', p.de).lt('decidida_em', p.ate),
  ])
  const eventos: EventoAgenda[] = []
  for (const c of exigir(compromissos)) {
    eventos.push({
      id: c.id, origem: 'compromisso', tipo: c.tipo, titulo: c.titulo, inicio: c.inicio, duracaoMin: c.duracao_min, status: c.status,
      pessoa: c.colaborador?.nome ?? null, pessoaId: c.colaborador_id, detalhe: [c.local, c.observacao, c.relato].filter(Boolean).join(' · ') || null, link: `/agenda?compromisso=${c.id}`,
    })
  }
  for (const c of exigir(combinados)) {
    const vencido = (c.status === 'aberto' || c.status === 'renegociado') && c.prazo! < hoje
    eventos.push({
      id: c.id, origem: 'combinado', tipo: null, titulo: c.descricao, inicio: c.prazo!, duracaoMin: null,
      status: c.status === 'cumprido' ? 'realizado' : c.status === 'nao_cumprido' ? 'cancelado' : vencido ? 'vencido' : 'agendado',
      pessoa: c.colaborador?.nome ?? null, pessoaId: c.colaborador_id, detalhe: c.status === 'nao_cumprido' ? 'Não cumprido' : null, link: '/combinados',
    })
  }
  for (const s of exigir(conversas)) {
    eventos.push({ id: s.id, origem: 'conversa', tipo: s.tipo, titulo: s.titulo, inicio: s.aplicada_em!, duracaoMin: null, status: 'realizado', pessoa: s.colaborador?.nome ?? null, pessoaId: s.colaborador_id, detalhe: null, link: `/situacoes/${s.id}` })
  }
  for (const d of exigir(reunioes)) {
    eventos.push({ id: d.id, origem: 'reuniao', tipo: d.tipo, titulo: d.titulo, inicio: d.data_evento!, duracaoMin: null, status: 'realizado', pessoa: null, pessoaId: null, detalhe: null, link: `/fontes/${d.id}` })
  }
  for (const d of exigir(decisoesPrazo)) {
    eventos.push({
      id: d.id, origem: 'decisao', tipo: null, titulo: `Decidir: ${d.titulo}`, inicio: d.prazo_decisao!, duracaoMin: null, status: d.prazo_decisao! < hoje ? 'vencido' : 'agendado',
      pessoa: d.colaborador?.nome ?? null, pessoaId: d.colaborador_id, detalhe: null, link: `/decisoes/${d.id}`,
    })
  }
  for (const d of exigir(decisoesTomadas)) {
    eventos.push({
      id: `${d.id}:decidida`, origem: 'decisao', tipo: null, titulo: `Decidido: ${d.titulo}`, inicio: d.decidida_em!, duracaoMin: null, status: 'realizado',
      pessoa: d.colaborador?.nome ?? null, pessoaId: d.colaborador_id, detalhe: d.opcao_escolhida, link: `/decisoes/${d.id}`,
    })
  }
  return eventos
}

export async function carregarEquipe(v: Vinculo): Promise<{ id: string; nome: string }[]> {
  if (!v.colaborador_id) return []
  const vinculos = exigir(await supabase.from('vinculo_lideranca').select('liderado:liderado_id(id, nome)').eq('lider_id', v.colaborador_id).is('fim', null))
  return vinculos
    .map((x) => x.liderado)
    .filter((p): p is { id: string; nome: string } => Boolean(p))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}
