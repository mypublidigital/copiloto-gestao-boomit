// Verificação determinística do plano (docs/03 §2, etapa 5). Roda sempre, depois do modelo,
// e não depende de skill nem de prompt:
// - fato sem fonte válida vai para "fatos a confirmar" (regra inviolável 2);
// - apelidos inventados somem; referências são reconstruídas a partir do pacote;
// - itens com termos proibidos (decisão sobre a pessoa, causa por personalidade, inferência
//   emocional) saem das listas e viram alerta.
import { termosProibidos } from './guardrails.ts'
import type { FonteDoPacote } from './pacote.ts'
import type { Plano } from './saida.ts'

export interface ReferenciaVerificada {
  fonte_id: string
  apelido: string
  rotulo: string
  camada: number
  data: string | null
}

export interface FatoVerificado {
  texto: string
  fonte_ids: string[]
}

/** Plano depois da verificação: as fontes já apontam para os fonte_id reais. */
export interface PlanoVerificado extends Omit<Plano, 'fatos_confirmados' | 'hipoteses' | 'referencias'> {
  fatos_confirmados: FatoVerificado[]
  hipoteses: { texto: string; base: string[]; como_testar_na_conversa: string }[]
  referencias: ReferenciaVerificada[]
}

export interface ResultadoVerificacao {
  plano: PlanoVerificado
  alertas: string[]
}

export function verificarPlano(plano: Plano, fontes: ReadonlyMap<string, FonteDoPacote>): ResultadoVerificacao {
  const alertas: string[] = []
  const usadas = new Set<string>()
  const resolver = (ids: string[]) => {
    const validos: string[] = []
    for (const id of ids) {
      const f = fontes.get(id.trim())
      if (f) {
        validos.push(f.fonte_id)
        usadas.add(f.apelido)
      } else alertas.push(`fonte_inexistente:${id}`)
    }
    return [...new Set(validos)]
  }

  const fatos_confirmados: FatoVerificado[] = []
  const fatos_a_confirmar = [...plano.fatos_a_confirmar]
  for (const fato of plano.fatos_confirmados) {
    const ids = resolver(fato.fonte_ids)
    if (ids.length) fatos_confirmados.push({ texto: fato.texto, fonte_ids: ids })
    else {
      alertas.push('fato_sem_fonte_movido_para_a_confirmar')
      fatos_a_confirmar.push({ texto: fato.texto, por_que_importa: 'Apareceu como fato, mas sem fonte verificável no contexto. Confirme antes da conversa.' })
    }
  }

  const hipoteses = plano.hipoteses.map((h) => ({ ...h, base: resolver(h.base) }))

  // Remove de listas o que viola as regras; textos únicos ficam e geram alerta para revisão.
  const filtrar = (lista: string[], campo: string) =>
    lista.filter((t) => {
      const regras = termosProibidos(t)
      for (const r of regras) alertas.push(`removido:${campo}:${r}`)
      return regras.length === 0
    })
  for (const [campo, valor] of [
    ['resumo_situacao', plano.resumo_situacao],
    ['abordagem.abertura', plano.abordagem.abertura],
  ] as const) {
    for (const r of termosProibidos(valor)) alertas.push(`revisar:${campo}:${r}`)
  }

  const combinados_propostos = plano.combinados_propostos
    .filter((c) => {
      const regras = termosProibidos(c.descricao)
      for (const r of regras) alertas.push(`removido:combinados_propostos:${r}`)
      return regras.length === 0
    })
    .map((c) => {
      const prazo = Math.round(c.prazo_sugerido_dias)
      if (!(prazo > 0)) alertas.push('combinado_sem_prazo')
      return { ...c, prazo_sugerido_dias: prazo > 0 ? prazo : 7 }
    })

  const referencias: ReferenciaVerificada[] = [...usadas]
    .map((apelido) => fontes.get(apelido)!)
    .sort((a, b) => Number(a.apelido.slice(1)) - Number(b.apelido.slice(1)))
    .map((f) => ({ fonte_id: f.fonte_id, apelido: f.apelido, rotulo: f.rotulo, camada: f.camada, data: f.data }))

  return {
    plano: {
      ...plano,
      fatos_confirmados,
      fatos_a_confirmar: fatos_a_confirmar.filter((f) => termosProibidos(f.texto).length === 0),
      hipoteses: hipoteses.filter((h) => termosProibidos(h.texto).length === 0),
      perguntas_sugeridas: filtrar(plano.perguntas_sugeridas, 'perguntas_sugeridas'),
      abordagem: { ...plano.abordagem, pontos_chave: filtrar(plano.abordagem.pontos_chave, 'abordagem.pontos_chave') },
      riscos: filtrar(plano.riscos, 'riscos'),
      combinados_propostos,
      referencias,
    },
    alertas: [...new Set(alertas)],
  }
}
