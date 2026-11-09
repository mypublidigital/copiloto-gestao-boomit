// Apoio à tomada de decisão (inclusão de 08/11/2026). O motor estrutura a decisão em critérios,
// alternativas e riscos; a pontuação ponderada é calculada aqui (determinística), nunca pelo
// modelo, e é apresentada como apoio: quem decide é o líder (regra inviolável 1).
// Verificação: fato sem fonte vira informação a confirmar; alçada "sim/nao" só com política
// citada; alternativa com termo proibido (decisão sobre a pessoa) sai e vira alerta.
import { z } from 'zod'
import * as prompt from '../prompts/decisao.ts'
import { CAMADAS, type ItemDeContexto } from './contexto.ts'
import { detectarSensivelPorTermos, GUARDRAILS, termosProibidos } from './guardrails.ts'
import type { ClienteModelo, Uso } from './modelo.ts'
import { montarPacote, semApelidos, type FonteDoPacote } from './pacote.ts'

const texto = z.string()

export const analiseDecisaoSchema = z.strictObject({
  reformulacao: texto,
  criterios: z.array(z.strictObject({ criterio: texto, peso: z.number(), por_que: texto })),
  alternativas: z.array(
    z.strictObject({
      opcao: texto,
      descricao: texto,
      pros: z.array(texto),
      contras: z.array(texto),
      riscos: z.array(texto),
      reversibilidade: z.enum(['facil', 'media', 'dificil']),
      notas: z.array(z.strictObject({ criterio: texto, nota: z.number(), justificativa: texto })),
    }),
  ),
  fatos_considerados: z.array(z.strictObject({ texto, fonte_ids: z.array(texto) })),
  informacoes_faltantes: z.array(z.strictObject({ pergunta: texto, por_que_importa: texto })),
  alcada: z.strictObject({ dentro_da_alcada: z.enum(['sim', 'nao', 'incerto']), justificativa: texto, fonte_ids: z.array(texto) }),
  quem_consultar: z.array(texto),
  impacto_em_pessoas: z.array(texto),
  proximos_passos: z.array(texto),
  sugestao_revisao_dias: z.number(),
  encaminhamento: z.strictObject({ necessario: z.boolean(), motivo: texto }),
})
export type AnaliseDecisao = z.infer<typeof analiseDecisaoSchema>

type AlternativaDoModelo = AnaliseDecisao['alternativas'][number]
export interface AlternativaVerificada extends AlternativaDoModelo {
  /** Média ponderada das notas (1 a 5), calculada pelo motor. */
  pontuacao: number
}

export interface AnaliseVerificada extends Omit<AnaliseDecisao, 'alternativas' | 'fatos_considerados' | 'alcada'> {
  alternativas: AlternativaVerificada[]
  fatos_considerados: { texto: string; fonte_ids: string[] }[]
  alcada: { dentro_da_alcada: 'sim' | 'nao' | 'incerto'; justificativa: string; fonte_ids: string[] }
  referencias: { fonte_id: string; apelido: string; rotulo: string; camada: number }[]
}

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))
const normalizar = (s: string) => s.trim().toLowerCase()

export function verificarDecisao(a: AnaliseDecisao, fontes: ReadonlyMap<string, FonteDoPacote>): { analise: AnaliseVerificada; alertas: string[] } {
  const alertas: string[] = []
  const usadas = new Map<string, FonteDoPacote>()
  const resolver = (ids: string[]) => {
    const r: FonteDoPacote[] = []
    for (const id of ids) {
      const f = fontes.get(id.trim())
      if (f) {
        r.push(f)
        usadas.set(f.apelido, f)
      } else alertas.push(`fonte_inexistente:${id}`)
    }
    return r
  }

  const criterios = a.criterios
    .filter((c) => c.criterio.trim())
    .map((c) => ({ ...c, peso: limitar(c.peso, 1, 5) }))
  const pesoTotal = criterios.reduce((s, c) => s + c.peso, 0) || 1

  const alternativas: AlternativaVerificada[] = []
  for (const alt of a.alternativas) {
    const conteudo = [alt.opcao, alt.descricao, ...alt.pros, ...alt.contras].join(' ')
    if (termosProibidos(conteudo).length) {
      alertas.push('alternativa_removida_por_regra')
      continue
    }
    const notas = alt.notas.map((n) => ({ ...n, nota: limitar(n.nota, 1, 5) }))
    const notaDe = (criterio: string) => notas.find((n) => normalizar(n.criterio) === normalizar(criterio))?.nota ?? 3
    const pontuacao = Math.round((criterios.reduce((s, c) => s + c.peso * notaDe(c.criterio), 0) / pesoTotal) * 10) / 10
    alternativas.push({ ...alt, notas, pontuacao })
  }

  const fatos_considerados: AnaliseVerificada['fatos_considerados'] = []
  const informacoes_faltantes = [...a.informacoes_faltantes]
  for (const f of a.fatos_considerados) {
    const ids = resolver(f.fonte_ids)
    if (ids.length) fatos_considerados.push({ texto: f.texto, fonte_ids: [...new Set(ids.map((x) => x.fonte_id))] })
    else {
      alertas.push('fato_sem_fonte_movido_para_a_confirmar')
      informacoes_faltantes.push({ pergunta: `Confirmar: ${f.texto}`, por_que_importa: 'Apareceu como fato, mas sem fonte verificável.' })
    }
  }

  const politicas = resolver(a.alcada.fonte_ids).filter((f) => f.camada === CAMADAS.politicas_e_alcadas)
  let alcada: AnaliseVerificada['alcada'] = { ...a.alcada, fonte_ids: politicas.map((p) => p.fonte_id) }
  if (a.alcada.dentro_da_alcada !== 'incerto' && politicas.length === 0) {
    alertas.push('alcada_sem_politica_vira_incerto')
    alcada = { dentro_da_alcada: 'incerto', justificativa: 'Nenhuma política ou alçada cadastrada sustenta essa resposta. Confirme com seu gestor ou com o RH.', fonte_ids: [] }
  }

  const limpar = (lista: string[]) =>
    lista.filter((t) => {
      if (termosProibidos(t).length === 0) return true
      alertas.push('item_removido_por_regra')
      return false
    })

  return {
    analise: {
      ...a,
      criterios,
      alternativas,
      fatos_considerados,
      informacoes_faltantes,
      alcada,
      impacto_em_pessoas: limpar(a.impacto_em_pessoas),
      proximos_passos: limpar(a.proximos_passos),
      sugestao_revisao_dias: limitar(a.sugestao_revisao_dias, 7, 180),
      referencias: [...usadas.values()].map((f) => ({ fonte_id: f.fonte_id, apelido: f.apelido, rotulo: f.rotulo, camada: f.camada })),
    },
    alertas,
  }
}

export interface EntradaDecisao {
  titulo: string
  pergunta: string
  contexto: string | null
  opcoes: string[]
  prazo: string | null
  /** Contexto já filtrado pela RLS (políticas e alçadas, organização, pessoa afetada). */
  itens: ItemDeContexto[]
  cliente: ClienteModelo
  modelo: string
}

export type ResultadoDecisao =
  | { tipo: 'encaminhamento'; motivo: string; uso: Uso | null; versao_prompt: string; fontes_ids: string[] }
  | { tipo: 'analise'; analise: AnaliseVerificada; alertas: string[]; uso: Uso; versao_prompt: string; fontes_ids: string[] }

export async function apoiarDecisao(e: EntradaDecisao): Promise<ResultadoDecisao> {
  const textoDoLider = [e.titulo, e.pergunta, e.contexto ?? '', ...e.opcoes].join('\n')
  if (detectarSensivelPorTermos(textoDoLider).sensivel) {
    return { tipo: 'encaminhamento', motivo: 'A decisão envolve uma situação que pede encaminhamento ao canal da empresa.', uso: null, versao_prompt: prompt.VERSAO, fontes_ids: [] }
  }
  const relato: ItemDeContexto = { fonte_id: 'relato', rotulo: 'Relato do líder', camada: CAMADAS.relato, conteudo: textoDoLider, data: null }
  const pacote = montarPacote([...e.itens.filter((i) => i.camada !== CAMADAS.relato), relato])
  const fontes_ids = [...pacote.fontes.values()].map((f) => f.fonte_id)

  const r = await e.cliente.gerar({
    finalidade: 'apoio_decisao',
    modelo: e.modelo,
    sistema: [
      { texto: [GUARDRAILS, pacote.estavel, prompt.INSTRUCOES, GUARDRAILS].filter(Boolean).join('\n\n'), cache: true },
      { texto: `# Contexto\n${pacote.contexto}` },
    ],
    mensagens: [{ papel: 'user', texto: prompt.pedido(e) }],
    schema: analiseDecisaoSchema,
    maxTokens: 16_000,
    esforco: 'medium',
    comFallback: true,
  })
  if (r.dados.encaminhamento.necessario) {
    return { tipo: 'encaminhamento', motivo: r.dados.encaminhamento.motivo, uso: r.uso, versao_prompt: prompt.VERSAO, fontes_ids }
  }
  const v = verificarDecisao(r.dados, pacote.fontes)
  v.analise = semApelidos(v.analise)
  return { tipo: 'analise', analise: v.analise, alertas: v.alertas, uso: r.uso, versao_prompt: prompt.VERSAO, fontes_ids }
}
