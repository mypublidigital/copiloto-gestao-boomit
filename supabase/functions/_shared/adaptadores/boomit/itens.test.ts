import { describe, expect, it } from 'vitest'
import fixture from '../../../../../fixtures/boomit/empresa-exemplo.v1.json' with { type: 'json' }
import { CAMADAS } from '../../motor/contexto.ts'
import { montarPacote } from '../../motor/pacote.ts'
import type { PayloadBoomitV1 } from './contrato.ts'
import { itensDaEmpresa, itensDaPessoa, itensDoHistorico } from './itens.ts'
import { normalizarColaborador, normalizarEmpresa } from './normalizador.ts'
import { mapaDeSinonimos, SINONIMOS_SEMENTE } from './sinonimos.ts'

const payload = fixture as unknown as PayloadBoomitV1
const ana = normalizarColaborador(payload.colaboradores.find((c) => c.nome === 'Ana Faria')!, mapaDeSinonimos(SINONIMOS_SEMENTE))
const pessoa = { id: 'c-ana', nome: 'Ana Faria', cargo: ana.colaborador.cargo, area: ana.colaborador.area }

describe('tradução do contexto Boomit em itens do motor', () => {
  const itens = itensDaPessoa(pessoa, ana.contexto)

  it('pessoa: cadastro, gaps, PDI, Focus, alinhamento, IA e personalidade na camada 5, com rótulos legíveis', () => {
    expect(itens.every((i) => i.camada === CAMADAS.pessoa)).toBe(true)
    expect(itens[0]?.rotulo).toBe('Cadastro · Ana Faria')
    expect(itens.filter((i) => i.rotulo.startsWith('Assessment Boomit')).length).toBe(ana.contexto.gaps_prioritarios.length)
    expect(itens.some((i) => i.rotulo.startsWith('PDI Boomit'))).toBe(true)
    expect(itens.some((i) => i.rotulo.startsWith('Parecer Focus'))).toBe(true)
    expect(itens.at(-1)?.rotulo).toBe('16 Personalidades · referência')
  })

  it('fonte_id é único e estável', () => {
    const ids = itens.map((i) => i.fonte_id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(itensDaPessoa(pessoa, ana.contexto).map((i) => i.fonte_id)).toEqual(ids)
  })

  it('indicadores sensíveis (PPL, quadrante, R3) nunca entram no contexto da IA', () => {
    expect(JSON.stringify(itens)).not.toMatch(/ppl|quadrante|promessas|estrelas|r3|promover|realocar/i)
  })

  it('personalidade vai com o aviso de referência; no corte, sai antes dos gaps', () => {
    expect(itens.at(-1)?.conteudo).toMatch(/não explica comportamento/)
    const p = montarPacote(itens, { maxCaracteres: 900 })
    expect(p.cortados).toContain(itens.at(-1)?.fonte_id)
    expect([...p.fontes.values()].some((f) => f.rotulo.startsWith('Assessment Boomit'))).toBe(true)
  })

  it('empresa: maturidade, estratégias e pontos-chave na camada 4', () => {
    const emp = itensDaEmpresa(normalizarEmpresa(payload.empresa).contexto)
    expect(emp.length).toBeGreaterThan(0)
    expect(emp.every((i) => i.camada === CAMADAS.organizacao)).toBe(true)
  })

  it('histórico: combinados abertos (vencidos rotulados) e registros dos últimos 90 dias', () => {
    const hoje = new Date('2026-11-04T12:00:00Z')
    const h = itensDoHistorico(
      [
        { id: 'r1', tipo: 'feedback', texto: 'Recente', data_fato: '2026-10-20', visibilidade: 'linha_gestao' },
        { id: 'r2', tipo: 'feedback', texto: 'Antigo', data_fato: '2026-01-10', visibilidade: 'linha_gestao' },
      ],
      [
        { id: 'k1', descricao: 'Revisar prioridades', status: 'aberto', prazo: '2026-11-01' },
        { id: 'k2', descricao: 'Já cumprido', status: 'cumprido', prazo: '2026-10-01' },
      ],
      hoje,
    )
    expect(h.map((i) => i.conteudo)).toEqual(['Revisar prioridades', 'Recente'])
    expect(h[0]?.rotulo).toMatch(/vencido/)
  })
})
