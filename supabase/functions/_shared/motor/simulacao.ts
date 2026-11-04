// Simulação de conversa e debrief (docs/03 §5). O ensaio é do líder: não gera nota e não vai
// para a gestão superior (quem chama grava em `simulacao`, que a RLS mantém privada).
import { instrucoesInterlocutor, INSTRUCOES_DEBRIEF, type Intensidade, VERSAO_DEBRIEF, VERSAO_SIMULACAO } from '../prompts/simulacao.ts'
import type { ItemDeContexto } from './contexto.ts'
import { GUARDRAILS } from './guardrails.ts'
import type { ClienteModelo, Mensagem, Uso } from './modelo.ts'
import { montarPacote } from './pacote.ts'
import { type Debrief, debriefSchema } from './saida.ts'

export type { Intensidade }
export const INTENSIDADES: Intensidade[] = ['receptiva', 'moderada', 'desafiadora']

export interface FalaEnsaio {
  quem: 'lider' | 'interlocutor'
  texto: string
}

export interface EntradaSimulacao {
  nomeInterlocutor: string
  intensidade: Intensidade
  /** Contexto da pessoa e da situação (já filtrado pela RLS). */
  itens: ItemDeContexto[]
  /** Resumo do plano preparado, se houver. */
  resumoPlano: string | null
  falas: FalaEnsaio[]
  cliente: ClienteModelo
  modelo: string
}

const paraMensagens = (falas: FalaEnsaio[]): Mensagem[] =>
  falas.map((f) => ({ papel: f.quem === 'lider' ? 'user' : 'assistant', texto: f.texto }))

export async function responderComoInterlocutor(
  e: EntradaSimulacao & { aoTexto?: (t: string) => void },
): Promise<{ texto: string; uso: Uso; versao_prompt: string }> {
  if (e.falas.length === 0 || e.falas[e.falas.length - 1]?.quem !== 'lider') {
    throw new Error('A simulação espera a próxima fala do líder')
  }
  const pacote = montarPacote(e.itens, { maxCaracteres: 12_000 })
  const r = await e.cliente.conversar({
    finalidade: 'simulacao',
    modelo: e.modelo,
    sistema: [
      { texto: `${GUARDRAILS}\n\n${instrucoesInterlocutor(e.nomeInterlocutor, e.intensidade)}`, cache: true },
      { texto: `# Contexto da situação\n${pacote.contexto}${e.resumoPlano ? `\n\n# O que o líder preparou\n${e.resumoPlano}` : ''}` },
    ],
    mensagens: paraMensagens(e.falas),
    maxTokens: 1_500,
    esforco: 'low',
    comFallback: true,
    aoTexto: e.aoTexto,
  })
  return { ...r, versao_prompt: VERSAO_SIMULACAO }
}

export async function gerarDebrief(e: Omit<EntradaSimulacao, 'nomeInterlocutor' | 'itens'> & { nomeInterlocutor: string }): Promise<{
  debrief: Debrief
  uso: Uso
  versao_prompt: string
}> {
  if (!e.falas.some((f) => f.quem === 'lider')) throw new Error('Não há falas do líder para revisar')
  const transcricao = e.falas.map((f) => `${f.quem === 'lider' ? 'LÍDER' : `${e.nomeInterlocutor.toUpperCase()} (simulado)`}: ${f.texto}`).join('\n')
  const r = await e.cliente.gerar({
    finalidade: 'debrief',
    modelo: e.modelo,
    sistema: [{ texto: `${GUARDRAILS}\n\n${INSTRUCOES_DEBRIEF}`, cache: true }],
    mensagens: [{ papel: 'user', texto: `Intensidade do ensaio: ${e.intensidade}.\n\nTranscrição:\n${transcricao}` }],
    schema: debriefSchema,
    maxTokens: 8_000,
    esforco: 'medium',
    comFallback: true,
  })
  return { debrief: r.dados, uso: r.uso, versao_prompt: VERSAO_DEBRIEF }
}
