import { describe, expect, it } from 'vitest'
import fixture from '../../fixtures/boomit/empresa-exemplo.v1.json' with { type: 'json' }
import type { PayloadBoomitV1 } from '../../supabase/functions/_shared/adaptadores/boomit/contrato.ts'
import { normalizarColaborador } from '../../supabase/functions/_shared/adaptadores/boomit/normalizador.ts'
import { mapaDeSinonimos, SINONIMOS_SEMENTE } from '../../supabase/functions/_shared/adaptadores/boomit/sinonimos.ts'
import { formatarData } from '@/lib/datas'
import { lerContexto, lerSensivel } from './contexto'
import { filtrarLinhaDoTempo, montarLinhaDoTempo, ROTULO_NATUREZA } from './linhaDoTempo'

const sinonimos = mapaDeSinonimos(SINONIMOS_SEMENTE)
const normalizados = (fixture as unknown as PayloadBoomitV1).colaboradores.map((c) => normalizarColaborador(c, sinonimos))

describe('contrato entre normalizador e interface', () => {
  it('a interface lê o contexto de todos os colaboradores do fixture', () => {
    for (const n of normalizados) expect(lerContexto(n.contexto), n.colaborador.nome).not.toBeNull()
  })

  it('a interface lê os indicadores sensíveis', () => {
    for (const n of normalizados) if (n.sensivel) expect(lerSensivel(n.sensivel)).not.toBeNull()
  })

  it('formato inesperado vira null, não quebra a tela', () => {
    expect(lerContexto({ qualquer: 'coisa' })).toBeNull()
  })
})

describe('linha do tempo', () => {
  const ana = normalizados.find((n) => n.colaborador.nome === 'Ana Faria')!
  const ctx = lerContexto(ana.contexto)

  it('compõe eventos Boomit com natureza "dado Boomit"', () => {
    const itens = montarLinhaDoTempo([], ctx)
    expect(itens.length).toBeGreaterThan(0)
    expect(itens.every((i) => i.natureza === 'dado_boomit')).toBe(true)
  })

  it('ensaio e relato nunca viram aplicação; natureza desconhecida é descartada', () => {
    const itens = montarLinhaDoTempo(
      [
        { quando: '2026-11-01T10:00:00Z', natureza: 'ensaio', subtipo: 'feedback', resumo: 'Simulação', origem_id: '1' },
        { quando: '2026-11-02T10:00:00Z', natureza: 'relato_lider', subtipo: 'observacao', resumo: 'Nota', origem_id: '2' },
        { quando: '2026-11-03T10:00:00Z', natureza: 'inventada', subtipo: null, resumo: 'x', origem_id: '3' },
      ],
      null,
    )
    expect(itens.map((i) => i.natureza)).toEqual(['relato_lider', 'ensaio'])
    expect(itens.map((i) => ROTULO_NATUREZA[i.natureza])).not.toContain(ROTULO_NATUREZA.aplicacao)
  })

  it('data pura vinda da view (meia-noite UTC) não volta um dia em São Paulo', () => {
    const [item] = montarLinhaDoTempo([{ quando: '2026-11-04T00:00:00+00:00', natureza: 'relato_lider', subtipo: 'reconhecimento', resumo: 'x', origem_id: 'r' }], null)
    expect(item?.quando).toBe('2026-11-04')
    expect(formatarData(item?.quando)).toBe('04/11/2026')
  })

  it('ordena do mais recente para o mais antigo', () => {
    const itens = montarLinhaDoTempo([{ quando: '2030-01-01T00:00:00Z', natureza: 'combinado', subtipo: 'aberto', resumo: 'Futuro', origem_id: 'z' }], ctx)
    expect(itens[0]?.titulo).toBe('Futuro')
  })
})

describe('linha do tempo · filtros', () => {
  const itens = montarLinhaDoTempo(
    [
      { quando: '2026-11-01T10:00:00Z', natureza: 'ensaio', subtipo: null, resumo: 'e', origem_id: '1' },
      { quando: '2026-11-02T10:00:00Z', natureza: 'combinado', subtipo: null, resumo: 'c', origem_id: '2' },
    ],
    lerContexto(normalizados[0]!.contexto),
  )
  it('por origem: só Boomit ou só Copiloto', () => {
    expect(filtrarLinhaDoTempo(itens, [], 'copiloto').map((i) => i.natureza)).toEqual(['combinado', 'ensaio'])
    expect(filtrarLinhaDoTempo(itens, [], 'boomit').every((i) => i.natureza === 'dado_boomit')).toBe(true)
  })
  it('por natureza', () => {
    expect(filtrarLinhaDoTempo(itens, ['combinado'], 'todas').map((i) => i.origemId)).toEqual(['2'])
  })
})

describe('datas', () => {
  it('exibe dd/mm/aaaa sem deslocar o dia', () => {
    expect(formatarData('2026-10-10')).toBe('10/10/2026')
    expect(formatarData('2026-10-20T01:00:00Z')).toBe('19/10/2026')
    expect(formatarData(null)).toBe('—')
  })
})
