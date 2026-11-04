import { describe, expect, it } from 'vitest'
import { compararPlanejado, semelhanca } from './comparacao'

describe('planejado × combinado', () => {
  it('semelhança ignora acento, plural e palavras curtas', () => {
    expect(semelhanca('Enviar o planejamento semanal', 'envia planejamentos semanais')).toBeGreaterThanOrEqual(0.6)
    expect(semelhanca('Revisar indicador', 'Comprar café')).toBe(0)
  })

  it('classifica cada proposto e lista o que é novo na reunião', () => {
    const planejados = [
      'Ana monta o planejamento semanal com entregas e datas e compartilha com o líder',
      'Ana avisa o líder assim que identificar risco de atraso',
      'Líder revisa o KPI de entregas no prazo a cada 1:1',
    ]
    const combinados = [
      'Enviar o planejamento semanal com entregas e datas para a Marina toda segunda',
      'Avisar no mesmo dia sempre que perceber risco de atraso, propondo nova data',
      'Conversar com a Daniela sobre critério de aceite das passagens',
    ]
    const r = compararPlanejado(planejados, combinados)
    expect(r.linhas.map((l) => l.resultado)).toEqual(['como_planejado', 'alterado', 'nao_tratado'])
    expect(r.linhas[0]?.combinado).toContain('planejamento semanal')
    expect(r.novos).toEqual(['Conversar com a Daniela sobre critério de aceite das passagens'])
  })

  it('um combinado da reunião não conta para dois planejados', () => {
    const r = compararPlanejado(['Plano semanal enviado', 'Plano semanal revisado'], ['Plano semanal enviado e revisado'])
    expect(r.linhas.filter((l) => l.combinado).length).toBe(1)
  })
})
