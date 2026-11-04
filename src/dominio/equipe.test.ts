import { describe, expect, it } from 'vitest'
import type { ContextoColaborador } from './contexto'
import { FILTROS_VAZIOS, filtrarEquipe, opcoesDeFiltro, ordenarEquipe, type PessoaEquipe } from './equipe'

const ctx = (nivelIa: number, gap: number) =>
  ({ ia: { score: null, nivel: nivelIa, dimensoes: {} }, gaps_prioritarios: [{ competencia: 'X', categoria: 'x', atual: 1, meta: 1 + gap, gap, origem: 'taticas' }] }) as unknown as ContextoColaborador

const p = (nome: string, area: string, nivelIa: number, gap: number, proximoPrazo: string | null = null, vencidos = 0): PessoaEquipe => ({
  id: nome,
  nome,
  cargo: 'Analista',
  area,
  nivel: 'operacional',
  contexto: ctx(nivelIa, gap),
  proximoPrazo,
  combinadosVencidos: vencidos,
})

const EQUIPE = [p('Beatriz', 'Operações', 1, 2), p('Ana', 'Operações', 2, 3.2, '2026-11-20'), p('Daniela', 'Tecnologia', 4, 1, '2026-11-10'), p('Carlos', 'Tecnologia', 5, 2.5, '2026-11-01', 1)]

describe('Minha equipe · filtros', () => {
  it('filtra por área, maturidade em IA e busca sem acento', () => {
    expect(filtrarEquipe(EQUIPE, { ...FILTROS_VAZIOS, area: 'Tecnologia' }).map((x) => x.nome)).toEqual(['Daniela', 'Carlos'])
    expect(filtrarEquipe(EQUIPE, { ...FILTROS_VAZIOS, niveisIa: [4, 5] }).map((x) => x.nome)).toEqual(['Daniela', 'Carlos'])
    expect(filtrarEquipe(EQUIPE, { ...FILTROS_VAZIOS, busca: 'beatríz' }).map((x) => x.nome)).toEqual(['Beatriz'])
    expect(filtrarEquipe(EQUIPE, FILTROS_VAZIOS)).toHaveLength(4)
  })

  it('opções de filtro vêm da própria equipe, sem repetição', () => {
    expect(opcoesDeFiltro(EQUIPE).areas).toEqual(['Operações', 'Tecnologia'])
  })
})

describe('Minha equipe · ordenação', () => {
  it('próxima ação: vencidos primeiro, depois prazo mais próximo, sem combinado por último', () => {
    expect(ordenarEquipe(EQUIPE, 'proxima_acao').map((x) => x.nome)).toEqual(['Carlos', 'Daniela', 'Ana', 'Beatriz'])
  })

  it('maior gap e nome', () => {
    expect(ordenarEquipe(EQUIPE, 'maior_gap').map((x) => x.nome)).toEqual(['Ana', 'Carlos', 'Beatriz', 'Daniela'])
    expect(ordenarEquipe(EQUIPE, 'nome').map((x) => x.nome)).toEqual(['Ana', 'Beatriz', 'Carlos', 'Daniela'])
  })
})
