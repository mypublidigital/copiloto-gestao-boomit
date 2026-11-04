// Montagem do pacote de contexto em camadas (docs/03 §3).
// - camadas 0, 2 e 3 (estáveis) vão no bloco de sistema com cache;
// - camada 1 (políticas e alçadas) é citável, para a decisão na alçada apontar a política, e nunca é cortada;
// - camadas 4 a 8 vão com um apelido curto (F1, F2…) por item, para o modelo citar;
// - o apelido é mapeado de volta para o fonte_id real na verificação.
import { CAMADAS, type ItemDeContexto, type NumeroCamada } from './contexto.ts'

export interface FonteDoPacote {
  apelido: string
  fonte_id: string
  rotulo: string
  camada: NumeroCamada
  conteudo: string
  data: string | null
}

export interface Pacote {
  /** Camadas 0–3, estáveis entre chamadas (cache de prompt). */
  estavel: string
  /** Camadas 4–8 com apelidos citáveis. */
  contexto: string
  /** Apelido → fonte. */
  fontes: Map<string, FonteDoPacote>
  /** Itens que ficaram de fora por limite de tamanho. */
  cortados: string[]
}

export interface OpcoesPacote {
  /** Limite aproximado de caracteres para as camadas 4 a 7 (o relato nunca é cortado). */
  maxCaracteres?: number
  /** Mínimo de itens da camada 5 preservados no corte (docs/03: "reduzir a 3 gaps"). */
  minimoPessoa?: number
}

const NOME_CAMADA: Record<number, string> = {
  1: 'Políticas e alçadas',
  4: 'Organização',
  5: 'Pessoa',
  6: 'Histórico',
  7: 'Reuniões e mentorias',
  8: 'Relato do líder',
}

export function montarPacote(itens: ItemDeContexto[], opcoes: OpcoesPacote = {}): Pacote {
  const max = opcoes.maxCaracteres ?? 24_000
  const minimoPessoa = opcoes.minimoPessoa ?? 3
  const ehPolitica = (i: ItemDeContexto) => i.camada === CAMADAS.politicas_e_alcadas
  const estaveis = itens.filter((i) => i.camada <= CAMADAS.skill_da_etapa && !ehPolitica(i)).sort((a, b) => a.camada - b.camada)
  let citaveis = itens.filter((i) => i.camada >= CAMADAS.organizacao || ehPolitica(i))

  // Corte: primeiro reuniões, depois histórico, depois a pessoa (até o mínimo), nunca o relato.
  const cortados: string[] = []
  const tamanho = () => citaveis.filter((i) => i.camada < CAMADAS.relato && !ehPolitica(i)).reduce((s, i) => s + i.conteudo.length + i.rotulo.length, 0)
  for (const camada of [CAMADAS.reunioes_e_mentorias, CAMADAS.historico, CAMADAS.pessoa, CAMADAS.organizacao] as NumeroCamada[]) {
    while (tamanho() > max) {
      const daCamada = citaveis.filter((i) => i.camada === camada)
      if (daCamada.length === 0 || (camada === CAMADAS.pessoa && daCamada.length <= minimoPessoa)) break
      const ultimo = daCamada[daCamada.length - 1]!
      cortados.push(ultimo.fonte_id)
      citaveis = citaveis.filter((i) => i !== ultimo)
    }
  }

  const fontes = new Map<string, FonteDoPacote>()
  const linhas: string[] = []
  let atual = -1
  citaveis
    .sort((a, b) => a.camada - b.camada)
    .forEach((item, indice) => {
      if (item.camada !== atual) {
        atual = item.camada
        linhas.push(`\n## ${NOME_CAMADA[item.camada] ?? `Camada ${item.camada}`}`)
      }
      const apelido = `F${indice + 1}`
      fontes.set(apelido, { apelido, ...item })
      linhas.push(`[${apelido}] ${item.rotulo}${item.data ? ` (${item.data})` : ''}\n${item.conteudo}`)
    })

  return {
    estavel: estaveis.map((i) => i.conteudo).join('\n\n'),
    contexto: linhas.join('\n').trim(),
    fontes,
    cortados,
  }
}
