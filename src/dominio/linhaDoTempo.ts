// Linha do tempo unificada do colaborador (docs/01 M2): eventos do Copiloto (view linha_do_tempo)
// + eventos Boomit compostos a partir do contexto. Cada item carrega a sua natureza explícita
// (regra inviolável 11): ensaio e relato nunca aparecem como aplicação.
import { instante } from '@/lib/datas'
import type { ContextoColaborador } from './contexto'

export type Natureza = 'dado_boomit' | 'ensaio' | 'relato_lider' | 'aplicacao' | 'combinado' | 'fonte'

export const ROTULO_NATUREZA: Record<Natureza, string> = {
  dado_boomit: 'Dado Boomit',
  ensaio: 'Ensaio (simulação)',
  relato_lider: 'Relato do líder',
  aplicacao: 'Aplicação (conversa real)',
  combinado: 'Combinado',
  fonte: 'Fonte',
}

export interface ItemLinhaDoTempo {
  chave: string
  quando: string
  natureza: Natureza
  titulo: string
  detalhe: string | null
}

/** Linha da view linha_do_tempo (já filtrada pela RLS para quem está vendo). */
export interface LinhaView {
  quando: string | null
  natureza: string | null
  subtipo: string | null
  resumo: string | null
  origem_id: string | null
}

const NATUREZAS_DA_VIEW = new Set<Natureza>(['ensaio', 'relato_lider', 'aplicacao', 'combinado', 'fonte'])

function daView(l: LinhaView): ItemLinhaDoTempo | null {
  const natureza = l.natureza as Natureza
  // Natureza desconhecida não é exibida com um rótulo inventado.
  if (!l.quando || !NATUREZAS_DA_VIEW.has(natureza)) return null
  return { chave: `${natureza}:${l.origem_id}`, quando: l.quando, natureza, titulo: l.resumo ?? '(sem título)', detalhe: l.subtipo }
}

export function eventosBoomit(ctx: ContextoColaborador | null): ItemLinhaDoTempo[] {
  if (!ctx) return []
  const itens: ItemLinhaDoTempo[] = []
  const add = (chave: string, quando: string | null | undefined, titulo: string, detalhe: string | null = null) => {
    if (quando) itens.push({ chave: `boomit:${chave}`, quando, natureza: 'dado_boomit', titulo, detalhe })
  }
  add('assessment', ctx.jornada?.assessment_respondido_em, 'Assessment respondido')
  add('personalidade', ctx.personalidade?.data, 'Teste 16 Personalidades')
  ctx.focus?.sessoes.forEach((s, i) => add(`focus:${i}`, s.data, 'Sessão Focus', s.status))
  add('pdi', ctx.pdi_boomit?.gerado_em, 'PDI Boomit gerado')
  add('devolutiva', ctx.devolutiva?.data, ctx.devolutiva?.concluida ? 'Devolutiva concluída' : 'Devolutiva agendada')
  return itens
}

export function montarLinhaDoTempo(view: LinhaView[], ctx: ContextoColaborador | null): ItemLinhaDoTempo[] {
  const itens = [...view.map(daView).filter((i): i is ItemLinhaDoTempo => i !== null), ...eventosBoomit(ctx)]
  return itens.sort((a, b) => instante(b.quando) - instante(a.quando))
}
