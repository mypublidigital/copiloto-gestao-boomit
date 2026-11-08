import { describe, expect, it } from 'vitest'
import { agruparPorDia, buscarEventos, diaSP, diasDaVisao, type EventoAgenda, limitesDaVisao, moverReferencia, pedeRegistro, tituloDaVisao } from './agenda'

const ev = (p: Partial<EventoAgenda>): EventoAgenda => ({
  id: 'x', origem: 'compromisso', tipo: 'um_a_um', titulo: '1:1', inicio: '2026-11-10T13:00:00Z', duracaoMin: 30, status: 'agendado', pessoa: null, pessoaId: null, detalhe: null, link: '/agenda', ...p,
})

describe('agenda', () => {
  it('semana vai de segunda a domingo', () => {
    expect(diasDaVisao('semana', '2026-11-12')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
  })

  it('mês cobre a grade completa de semanas', () => {
    const dias = diasDaVisao('mes', '2026-11-20')
    expect(dias[0]).toBe('2026-10-26')
    expect(dias.at(-1)).toBe('2026-12-06')
    expect(dias.length % 7).toBe(0)
  })

  it('limites em São Paulo e navegação entre meses', () => {
    expect(limitesDaVisao('dia', '2026-11-10')).toMatchObject({ de: '2026-11-10T00:00:00-03:00', ate: '2026-11-11T00:00:00-03:00' })
    expect(moverReferencia('mes', '2026-12-15', 1)).toBe('2027-01-01')
    expect(moverReferencia('mes', '2026-01-15', -1)).toBe('2025-12-01')
    expect(tituloDaVisao('semana', '2026-11-12')).toBe('09/11 a 15/11/2026')
  })

  it('dia em São Paulo: 01h UTC ainda é o dia anterior', () => {
    expect(diaSP('2026-11-10T01:00:00Z')).toBe('2026-11-09')
    expect(diaSP('2026-11-10')).toBe('2026-11-10')
  })

  it('busca sem acento, por todas as palavras, inclusive pessoa e tipo', () => {
    const lista = [ev({ id: 'a', pessoa: 'Júlia Ramos', tipo: 'feedback', titulo: 'Feedback entregas' }), ev({ id: 'b', pessoa: 'Caio', titulo: 'Plano' })]
    expect(buscarEventos(lista, 'julia feedback').map((e) => e.id)).toEqual(['a'])
    expect(buscarEventos(lista, '1:1').map((e) => e.id)).toEqual(['b'])
    expect(buscarEventos(lista, '  ')).toHaveLength(2)
  })

  it('agrupa por dia com prazos (dia inteiro) antes dos horários', () => {
    const g = agruparPorDia([ev({ id: 'h', inicio: '2026-11-10T15:00:00Z' }), ev({ id: 'p', origem: 'combinado', inicio: '2026-11-10' })])
    expect(g.get('2026-11-10')!.map((e) => e.id)).toEqual(['p', 'h'])
  })

  it('compromisso que já passou e segue agendado pede registro', () => {
    expect(pedeRegistro(ev({}), new Date('2026-11-11T00:00:00Z'))).toBe(true)
    expect(pedeRegistro(ev({ status: 'realizado' }), new Date('2026-11-11T00:00:00Z'))).toBe(false)
  })
})
