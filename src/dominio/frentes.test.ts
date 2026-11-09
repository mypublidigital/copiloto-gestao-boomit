import { describe, expect, it } from 'vitest'
import { cadenciaDeUmAUm, contarPor, diasDesde, distribuicaoIA, maisRecentePorPessoa, media, taxaDeCumprimento } from './frentes'

const agora = Date.parse('2026-11-08T15:00:00Z')

describe('frentes', () => {
  it('taxa de cumprimento só conta combinados encerrados', () => {
    expect(taxaDeCumprimento([{ status: 'cumprido' }, { status: 'cumprido' }, { status: 'nao_cumprido' }, { status: 'aberto' }])).toBe(67)
    expect(taxaDeCumprimento([{ status: 'aberto' }])).toBeNull()
  })

  it('dias desde uma data pura ou data-hora', () => {
    expect(diasDesde('2026-11-01', agora)).toBe(7)
    expect(diasDesde(null, agora)).toBeNull()
  })

  it('mais recente por pessoa', () => {
    const m = maisRecentePorPessoa(
      [{ colaborador_id: 'a', d: '2026-10-01' }, { colaborador_id: 'a', d: '2026-11-01' }, { colaborador_id: null, d: '2026-11-05' }],
      (x) => x.d,
    )
    expect(m.get('a')).toBe('2026-11-01')
    expect(m.size).toBe(1)
  })

  it('cadência de 1:1: em dia, agendado e sem cadência', () => {
    const r = cadenciaDeUmAUm(
      [
        { colaborador_id: 'ana', tipo: 'um_a_um', status: 'realizado', inicio: '2026-11-02T13:00:00Z', realizado_em: '2026-11-02T13:30:00Z' },
        { colaborador_id: 'bia', tipo: 'um_a_um', status: 'agendado', inicio: '2026-11-10T13:00:00Z', realizado_em: null },
        { colaborador_id: 'caio', tipo: 'um_a_um', status: 'realizado', inicio: '2026-09-01T13:00:00Z', realizado_em: null },
        { colaborador_id: 'davi', tipo: 'feedback', status: 'realizado', inicio: '2026-11-03T13:00:00Z', realizado_em: null },
      ],
      ['ana', 'bia', 'caio', 'davi'],
      agora,
    )
    expect(r.emDia).toEqual(['ana'])
    expect(r.agendados).toEqual(['bia'])
    expect(r.semCadencia).toEqual(['caio', 'davi'])
    expect(r.pct).toBe(25)
  })

  it('distribuição de maturidade em IA, média e contagem', () => {
    expect(distribuicaoIA([1, 1, 3, null, 5])).toEqual({ 1: 2, 2: 0, 3: 1, 4: 0, 5: 1, sem: 1 })
    expect(media([70, 80, null])).toBe(75)
    expect(contarPor([{ a: 'Ops' }, { a: 'TI' }, { a: 'Ops' }, { a: null }], (x) => x.a)).toEqual([['Ops', 2], ['Sem informação', 1], ['TI', 1]])
  })
})
