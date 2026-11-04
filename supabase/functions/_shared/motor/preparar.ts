// Orquestração de uma preparação (docs/03 §2):
// relato → classificação (rápido) → [sensível? encaminhamento] → pacote → geração (principal)
// → verificação determinística. Quem chama grava preparação e interacao_ia (só metadados).
import * as promptClassificacao from '../prompts/classificacao.ts'
import * as promptPreparacao from '../prompts/preparacao.ts'
import { CAMADAS, type ItemDeContexto } from './contexto.ts'
import { detectarSensivelPorTermos, GUARDRAILS } from './guardrails.ts'
import type { ClienteModelo, Uso } from './modelo.ts'
import { montarPacote, type Pacote } from './pacote.ts'
import { type Classificacao, classificacaoSchema, planoSchema } from './saida.ts'
import { type PlanoVerificado, verificarPlano } from './verificacao.ts'

export interface Modelos {
  principal: string
  rapido: string
}

export interface ChamadaRegistrada {
  finalidade: 'classificacao' | 'preparacao'
  versao_prompt: string
  uso: Uso
  fontes_ids: string[]
}

export interface EntradaPreparacao {
  relato: string
  /** Contexto já filtrado pela RLS do usuário (o motor não decide quem vê o quê). */
  itens: ItemDeContexto[]
  cliente: ClienteModelo
  modelos: Modelos
}

export type ResultadoPreparacao =
  | {
      tipo: 'encaminhamento'
      categoria: string
      motivo: string
      classificacao: Classificacao | null
      chamadas: ChamadaRegistrada[]
    }
  | {
      tipo: 'plano'
      plano: PlanoVerificado
      alertas: string[]
      classificacao: Classificacao
      pacote: Pacote
      chamadas: ChamadaRegistrada[]
    }

export const ID_RELATO = 'relato'

export async function prepararSituacao(e: EntradaPreparacao): Promise<ResultadoPreparacao> {
  const chamadas: ChamadaRegistrada[] = []
  const porTermos = detectarSensivelPorTermos(e.relato)

  // Sensível por termos: nem chama o modelo principal, e o relato não segue para geração.
  if (porTermos.sensivel) {
    return { tipo: 'encaminhamento', categoria: porTermos.categoria ?? 'sensivel', motivo: 'O relato indica uma situação que pede encaminhamento.', classificacao: null, chamadas }
  }

  const classificacao = await e.cliente.gerar({
    finalidade: 'classificacao',
    modelo: e.modelos.rapido,
    sistema: [{ texto: promptClassificacao.INSTRUCOES, cache: true }],
    mensagens: [{ papel: 'user', texto: e.relato }],
    schema: classificacaoSchema,
    maxTokens: 2_000,
    esforco: 'low',
  })
  chamadas.push({ finalidade: 'classificacao', versao_prompt: promptClassificacao.VERSAO, uso: classificacao.uso, fontes_ids: [] })

  if (classificacao.dados.sensivel) {
    return {
      tipo: 'encaminhamento',
      categoria: classificacao.dados.categoria_sensivel,
      motivo: classificacao.dados.motivo_sensivel || 'O relato indica uma situação que pede encaminhamento.',
      classificacao: classificacao.dados,
      chamadas,
    }
  }

  const relato: ItemDeContexto = { fonte_id: ID_RELATO, rotulo: 'Relato do líder', camada: CAMADAS.relato, conteudo: e.relato, data: null }
  const pacote = montarPacote([...e.itens.filter((i) => i.camada !== CAMADAS.relato), relato])

  const gerado = await e.cliente.gerar({
    finalidade: 'preparacao',
    modelo: e.modelos.principal,
    // Guardrails antes e depois do bloco estável (lente/skills), contexto variável por último.
    sistema: [
      { texto: [GUARDRAILS, pacote.estavel, promptPreparacao.INSTRUCOES, GUARDRAILS].filter(Boolean).join('\n\n'), cache: true },
      { texto: `# Contexto\n${pacote.contexto}` },
    ],
    mensagens: [{ papel: 'user', texto: 'Prepare o plano da conversa de feedback a partir do relato [identificado no contexto] e do contexto acima.' }],
    schema: planoSchema,
    maxTokens: 16_000,
    esforco: 'medium',
    comFallback: true,
  })

  const verificado = verificarPlano(gerado.dados, pacote.fontes)
  chamadas.push({
    finalidade: 'preparacao',
    versao_prompt: promptPreparacao.VERSAO,
    uso: gerado.uso,
    fontes_ids: [...pacote.fontes.values()].map((f) => f.fonte_id),
  })

  // O modelo pode, mesmo assim, sinalizar encaminhamento: respeitamos (precedência dos guardrails).
  if (verificado.plano.encaminhamento.necessario) {
    return { tipo: 'encaminhamento', categoria: 'sinalizado_no_plano', motivo: verificado.plano.encaminhamento.motivo, classificacao: classificacao.dados, chamadas }
  }

  return { tipo: 'plano', plano: verificado.plano, alertas: verificado.alertas, classificacao: classificacao.dados, pacote, chamadas }
}
