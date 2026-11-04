// Filtros e ordenação da Minha equipe (Sprint 2, M1). Lógica pura, testada em equipe.test.ts.
import type { ContextoColaborador } from './contexto'

export interface PessoaEquipe {
  id: string
  nome: string
  cargo: string | null
  area: string | null
  nivel: string | null
  contexto: ContextoColaborador | null
  /** Prazo mais próximo entre os combinados abertos com esta pessoa (aaaa-mm-dd). */
  proximoPrazo: string | null
  combinadosVencidos: number
}

export interface FiltrosEquipe {
  area: string | null
  nivel: string | null
  /** Níveis de maturidade em IA (1 a 5) aceitos; vazio = todos. */
  niveisIa: number[]
  busca: string
}

export const FILTROS_VAZIOS: FiltrosEquipe = { area: null, nivel: null, niveisIa: [], busca: '' }

export type Ordem = 'proxima_acao' | 'nome' | 'maior_gap'

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function opcoesDeFiltro(pessoas: PessoaEquipe[]) {
  const unicos = (v: (string | null)[]) => [...new Set(v.filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return { areas: unicos(pessoas.map((p) => p.area)), niveis: unicos(pessoas.map((p) => p.nivel)) }
}

export function filtrarEquipe(pessoas: PessoaEquipe[], f: FiltrosEquipe): PessoaEquipe[] {
  const termo = semAcento(f.busca.trim())
  return pessoas.filter(
    (p) =>
      (!f.area || p.area === f.area) &&
      (!f.nivel || p.nivel === f.nivel) &&
      (f.niveisIa.length === 0 || (p.contexto?.ia?.nivel != null && f.niveisIa.includes(p.contexto.ia.nivel))) &&
      (!termo || semAcento(`${p.nome} ${p.cargo ?? ''}`).includes(termo)),
  )
}

const maiorGap = (p: PessoaEquipe) => p.contexto?.gaps_prioritarios[0]?.gap ?? 0

/** "Próxima ação": vencidos primeiro, depois o prazo mais próximo; quem não tem combinado vai para o fim. */
export function ordenarEquipe(pessoas: PessoaEquipe[], ordem: Ordem): PessoaEquipe[] {
  const porNome = (a: PessoaEquipe, b: PessoaEquipe) => a.nome.localeCompare(b.nome, 'pt-BR')
  const copia = [...pessoas]
  if (ordem === 'nome') return copia.sort(porNome)
  if (ordem === 'maior_gap') return copia.sort((a, b) => maiorGap(b) - maiorGap(a) || porNome(a, b))
  return copia.sort((a, b) => {
    if (a.combinadosVencidos !== b.combinadosVencidos) return b.combinadosVencidos - a.combinadosVencidos
    if (a.proximoPrazo && b.proximoPrazo) return a.proximoPrazo.localeCompare(b.proximoPrazo) || porNome(a, b)
    if (a.proximoPrazo) return -1
    if (b.proximoPrazo) return 1
    return porNome(a, b)
  })
}
