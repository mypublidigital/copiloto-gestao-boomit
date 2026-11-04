import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import fixture from '../../../../../fixtures/boomit/empresa-exemplo.v1.json' with { type: 'json' }
import type { ColaboradorBoomit, PayloadBoomitV1 } from './contrato.ts'
import { criarFonte, FonteMock } from './fonte.ts'
import { mapearCompetencia, normalizarColaborador, normalizarEmpresa, paraDataIso, paraNumero } from './normalizador.ts'
import { mapaDeSinonimos, normalizarChave, SINONIMOS_SEMENTE } from './sinonimos.ts'
import { ContratoInvalidoError, validarPayload } from './validar.ts'

const sinonimos = mapaDeSinonimos(SINONIMOS_SEMENTE)
const payload = fixture as unknown as PayloadBoomitV1
const pessoa = (nome: string) => {
  const c = payload.colaboradores.find((x) => x.nome === nome)
  if (!c) throw new Error(`fixture sem ${nome}`)
  return structuredClone(c)
}

describe('FonteBoomit', () => {
  it('FonteMock devolve o fixture validado contra o contrato', async () => {
    const dados = await new FonteMock().buscar()
    expect(dados.schema_version).toBe('1.0')
    expect(dados.colaboradores).toHaveLength(13)
  })

  it('contrato recusa payload fora do formato', () => {
    expect(() => validarPayload({ schema_version: '9.9' })).toThrow(ContratoInvalidoError)
  })

  it('BOOMIT_FONTE escolhe a implementação; api ainda não existe', async () => {
    expect(criarFonte(undefined).nome).toBe('mock')
    expect(criarFonte('api').nome).toBe('api')
    await expect(criarFonte('api').buscar({})).rejects.toThrow(/Sprint 1/)
    expect(() => criarFonte('planilha')).toThrow(/inválida/)
  })
})

describe('R1 · competências', () => {
  it('normaliza a chave: minúsculas, sem acento, _ vira espaço, espaços colapsados', () => {
    expect(normalizarChave('  Comunicacao_eficaz ')).toBe('comunicacao eficaz')
    expect(normalizarChave('Construção   De Planos')).toBe('construcao de planos')
  })

  it('variações da mesma competência viram um nome canônico', () => {
    const alertas: string[] = []
    const nomes = ['Construção De Planos', 'Construção de Planos', 'construcao_de_planos'].map((k) => mapearCompetencia(k, sinonimos, alertas).competencia)
    expect(new Set(nomes)).toEqual(new Set(['Construção de Planos']))
    expect(mapearCompetencia('Comunicacaoefetiva', sinonimos, alertas).competencia).toBe('Comunicação')
    expect(mapearCompetencia('Qualidade_trabalho', sinonimos, alertas).competencia).toBe('Qualidade do Trabalho')
    expect(alertas).toEqual([])
  })

  it('chave desconhecida gera alerta e não derruba a normalização', () => {
    const c = pessoa('Ana Faria')
    c.digital_crescimento = [{ competencia: 'Telepatia', meta: 9, atual: 2 }]
    const r = normalizarColaborador(c, sinonimos)
    expect(r.alertas).toContain('competencia_desconhecida:Telepatia')
    expect(r.contexto.competencias[0]).toMatchObject({ competencia: 'Telepatia', categoria: 'desconhecida' })
  })

  it('todas as chaves do fixture são reconhecidas', () => {
    const alertas = payload.colaboradores.flatMap((c) => normalizarColaborador(c, sinonimos).alertas)
    expect(alertas.filter((a) => a.startsWith('competencia_desconhecida'))).toEqual([])
  })

  it('a migration 0002 tem exatamente os sinônimos do código', () => {
    const sql = readFileSync(path.resolve(import.meta.dirname, '../../../../migrations/0002_competencia_sinonimo.sql'), 'utf8')
    const doSql = [...sql.matchAll(/^\s+\('([^']+)', '([^']+)', '([^']+)'\)/gm)].map((m) => `${m[1]}|${m[2]}|${m[3]}`).sort()
    const doCodigo = SINONIMOS_SEMENTE.map((s) => `${s.chave_normalizada}|${s.competencia_canonica}|${s.categoria}`).sort()
    expect(doSql).toEqual(doCodigo)
  })
})

describe('R5 · números e datas', () => {
  it('aceita vírgula e ponto decimais', () => {
    expect(paraNumero('-3,92')).toBe(-3.92)
    expect(paraNumero('6.62')).toBe(6.62)
    expect(paraNumero('1.234,5')).toBe(1234.5)
    expect(paraNumero(7)).toBe(7)
    expect(paraNumero('')).toBeNull()
    expect(paraNumero('n/d')).toBeNull()
    expect(paraNumero(null)).toBeNull()
  })

  it('converte dd/mm/aaaa para ISO e mantém ISO', () => {
    expect(paraDataIso('05/09/2026')).toBe('2026-09-05')
    expect(paraDataIso('2026-10-01')).toBe('2026-10-01')
    expect(paraDataIso('2026-10-20T10:00:00-03:00')).toBe('2026-10-20T10:00:00-03:00')
    expect(paraDataIso('31/02/2026')).toBeNull()
    expect(paraDataIso('ontem')).toBeNull()
  })

  it('números em texto chegam como número no contexto; data inválida vira alerta', () => {
    const c = pessoa('Ana Faria')
    c.digital_crescimento = [{ competencia: 'Foco', auto: '8,0', meta: '9', atual: '6,5' }]
    c.devolutiva = { data: '10/10/2026', concluida: true }
    c.personalidade = { tipo: 'ENFJ-A', data: '99/99/2026' }
    const r = normalizarColaborador(c, sinonimos)
    expect(r.contexto.competencias[0]).toMatchObject({ auto: 8, meta: 9, atual: 6.5, gap: 2.5 })
    expect(r.contexto.devolutiva?.data).toBe('2026-10-10')
    expect(r.contexto.personalidade?.data).toBeNull()
    expect(r.alertas).toContain('data_invalida:personalidade.data=99/99/2026')
  })
})

describe('R9 · seções indisponíveis', () => {
  it('seção marcada indisponível fica nula e vira alerta; o resto segue', () => {
    const r = normalizarColaborador(pessoa('Gabriel Torres'), sinonimos)
    expect(r.contexto.personalidade).toBeNull()
    expect(r.contexto.secoes_indisponiveis).toContain('personalidade')
    expect(r.alertas.some((a) => a.startsWith('secao_indisponivel:personalidade'))).toBe(true)
    expect(r.contexto.competencias.length).toBeGreaterThan(0)
  })

  it('seção malformada não derruba a normalização inteira', () => {
    const c = pessoa('Ana Faria') as ColaboradorBoomit & { focus: unknown }
    c.focus = { analise_tecnica: 42 as unknown as Record<string, string>, sessoes: 'quebrado' as unknown as [] }
    const r = normalizarColaborador(c, sinonimos)
    expect(r.contexto.focus).toBeNull()
    expect(r.contexto.secoes_indisponiveis).toContain('focus')
    expect(r.contexto.alinhamento).not.toBeNull()
  })

  it('empresa: Digital Organizacional indisponível no fixture', () => {
    const { contexto, alertas } = normalizarEmpresa(payload.empresa)
    expect(contexto.secoes_indisponiveis).toEqual(['digital_organizacional'])
    expect(alertas[0]).toMatch(/^secao_indisponivel:digital_organizacional/)
    expect(contexto.maturidade?.nota).toBe('B')
  })
})

describe('Minimização e separação de sensíveis', () => {
  it('salário, gênero, celular e financeiro nunca aparecem no resultado', () => {
    const c = { ...pessoa('Ana Faria'), salario: 9999, genero: 'x', celular: '11999990000' }
    const r = normalizarColaborador(c, sinonimos)
    const texto = JSON.stringify(r)
    expect(texto).not.toMatch(/salario|genero|celular|9999|11999990000/)
    const e = normalizarEmpresa({ ...payload.empresa, financeiro: { faturamento_anual: 123456789 } })
    expect(JSON.stringify(e)).not.toMatch(/financeiro|123456789/)
  })

  it('PPL, quadrante e R3 ficam só no bloco sensível', () => {
    const r = normalizarColaborador(pessoa('Ana Faria'), sinonimos)
    expect(JSON.stringify(r.contexto)).not.toMatch(/ppl|quadrante|r3|promover|realocar/i)
    expect(r.sensivel).toMatchObject({ ppl: expect.any(Number) })
  })

  it('gaps prioritários: até 5, maiores primeiro, só abaixo da meta', () => {
    const r = normalizarColaborador(pessoa('Ana Faria'), sinonimos)
    const gaps = r.contexto.gaps_prioritarios.map((g) => g.gap ?? 0)
    expect(gaps.length).toBeGreaterThanOrEqual(3)
    expect(gaps.length).toBeLessThanOrEqual(5)
    expect([...gaps].sort((a, b) => b - a)).toEqual(gaps)
    expect(gaps.every((g) => g > 0)).toBe(true)
  })
})

describe('Regras da Sprint 1 (pendentes)', () => {
  it.todo('R2 · maturidade oficial do Resumo Estratégico; divergência vira alerta')
  it.todo('R3 · número citado em texto de IA que diverge do campo vira alerta')
  it.todo('R4 · temperamentos MBTI recalculados a partir do tipo')
  it.todo('R6 · área normalizada contra o enum; cargo só para exibição')
  it.todo('R7 · status da etapa Personalidade derivado da presença do tipo')
  it.todo('R8 · tempo de desenvolvimento em meses; faixa calculada no Copiloto')
  it.todo('R10 · snapshot deduplicado por hash; diferença gera nova versão')
  it.todo('R11 · campos de destaque ignorados')
})
