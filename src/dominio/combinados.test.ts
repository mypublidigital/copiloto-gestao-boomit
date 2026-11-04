import { describe, expect, it } from 'vitest'
import { estaVencido, hojeSaoPaulo, somarDias } from './combinados'

describe('combinados', () => {
  it('soma dias sem efeito de fuso, inclusive na virada de mês e ano', () => {
    expect(somarDias('2026-11-04', 7)).toBe('2026-11-11')
    expect(somarDias('2026-11-28', 7)).toBe('2026-12-05')
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('"hoje" é a data de São Paulo, não a UTC', () => {
    // 02:00 UTC de 05/11 ainda é 04/11 em São Paulo (UTC-3)
    expect(hojeSaoPaulo(new Date('2026-11-05T02:00:00Z'))).toBe('2026-11-04')
  })

  it('só combinado aberto ou renegociado com prazo passado está vencido', () => {
    const hoje = '2026-11-04'
    expect(estaVencido({ status: 'aberto', prazo: '2026-11-03' }, hoje)).toBe(true)
    expect(estaVencido({ status: 'aberto', prazo: '2026-11-04' }, hoje)).toBe(false)
    expect(estaVencido({ status: 'cumprido', prazo: '2026-10-01' }, hoje)).toBe(false)
    expect(estaVencido({ status: 'pendente_revisao', prazo: '2026-10-01' }, hoje)).toBe(false)
    expect(estaVencido({ status: 'aberto', prazo: null }, hoje)).toBe(false)
  })
})
