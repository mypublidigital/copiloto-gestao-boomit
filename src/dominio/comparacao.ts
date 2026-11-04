// Planejado × combinado na reunião (docs/02 §4, passo 8): compara os combinados propostos na
// preparação com os extraídos da reunião. Radical de 5 letras por palavra (aproxima flexões do
// português: enviar/envia, semanal/semanais); o líder vê a comparação e decide.

export type ResultadoComparacao = 'como_planejado' | 'alterado' | 'nao_tratado'

export interface LinhaComparacao {
  planejado: string
  resultado: ResultadoComparacao
  combinado: string | null
  semelhanca: number
}

const PARADAS = new Set(['para', 'com', 'que', 'uma', 'das', 'dos', 'nos', 'nas', 'pela', 'pelo', 'cada', 'toda', 'todo', 'sobre', 'entre', 'mais', 'antes', 'depois', 'sempre'])

export function palavras(texto: string): Set<string> {
  return new Set(
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .match(/[a-z0-9]{4,}/g)
      ?.filter((p) => !PARADAS.has(p))
      .map((p) => p.slice(0, 5)) ?? [],
  )
}

/** Proporção de palavras do menor texto que aparecem no outro (0 a 1). */
export function semelhanca(a: string, b: string): number {
  const pa = palavras(a)
  const pb = palavras(b)
  if (!pa.size || !pb.size) return 0
  const comuns = [...pa].filter((p) => pb.has(p)).length
  return Math.round((comuns / Math.min(pa.size, pb.size)) * 100) / 100
}

export const ROTULO_COMPARACAO: Record<ResultadoComparacao | 'novo', string> = {
  como_planejado: 'Como planejado',
  alterado: 'Alterado',
  nao_tratado: 'Não tratado',
  novo: 'Novo na reunião',
}

export function compararPlanejado(planejados: string[], combinados: string[]): { linhas: LinhaComparacao[]; novos: string[] } {
  const usados = new Set<number>()
  const linhas = planejados.map((planejado) => {
    let melhor = -1
    let valor = 0
    combinados.forEach((c, i) => {
      const s = semelhanca(planejado, c)
      if (!usados.has(i) && s > valor) {
        valor = s
        melhor = i
      }
    })
    if (melhor >= 0 && valor >= 0.25) usados.add(melhor)
    const resultado: ResultadoComparacao = valor >= 0.55 ? 'como_planejado' : valor >= 0.25 ? 'alterado' : 'nao_tratado'
    return { planejado, resultado, combinado: resultado === 'nao_tratado' ? null : (combinados[melhor] ?? null), semelhanca: valor }
  })
  return { linhas, novos: combinados.filter((_, i) => !usados.has(i)) }
}
