// Contrato do motor com o modelo de linguagem. O motor só fala com esta interface:
// em produção, ClienteAnthropic (anthropic.ts); nos testes, ModeloSimulado (simulado.ts).
import type { z } from 'zod'

export interface BlocoSistema {
  texto: string
  /** Marca o fim de um prefixo estável para cache de prompt. */
  cache?: boolean
}

export interface Mensagem {
  papel: 'user' | 'assistant'
  texto: string
}

export interface Uso {
  modelo: string
  tokens_entrada: number
  tokens_saida: number
  cache_leitura: number
  cache_escrita: number
  latencia_ms: number
}

export interface ChamadaEstruturada<T> {
  finalidade: string
  modelo: string
  sistema: BlocoSistema[]
  mensagens: Mensagem[]
  schema: z.ZodType<T>
  maxTokens?: number
  esforco?: 'low' | 'medium' | 'high'
  /** Pede ao servidor um modelo substituto se este recusar (só modelos que aceitam). */
  comFallback?: boolean
}

export interface ChamadaConversa {
  finalidade: string
  modelo: string
  sistema: BlocoSistema[]
  mensagens: Mensagem[]
  maxTokens?: number
  esforco?: 'low' | 'medium' | 'high'
  comFallback?: boolean
  /** Recebe cada trecho de texto à medida que chega (streaming). */
  aoTexto?: (trecho: string) => void
}

export interface ClienteModelo {
  gerar<T>(chamada: ChamadaEstruturada<T>): Promise<{ dados: T; uso: Uso }>
  conversar(chamada: ChamadaConversa): Promise<{ texto: string; uso: Uso }>
}

/** O modelo recusou a tarefa (stop_reason = refusal), mesmo após o fallback. */
export class RecusaDoModeloError extends Error {
  readonly categoria: string | null
  constructor(categoria: string | null) {
    super(`O modelo recusou a solicitação${categoria ? ` (${categoria})` : ''}`)
    this.categoria = categoria
  }
}

/** A saída não passou na validação do schema. */
export class SaidaInvalidaError extends Error {}

// ---------- custo ----------

// US$ por 1 milhão de tokens (API Anthropic, tabela de 06/10/2026). Escrita de cache = 1,25× a
// entrada; leitura de cache = 0,1× a entrada. Modelo fora da tabela → custo desconhecido (null).
const PRECOS: Record<string, { entrada: number; saida: number }> = {
  'claude-opus-5-5': { entrada: 4, saida: 20 },
  'claude-sonnet-5-5': { entrada: 2, saida: 10 },
  'claude-haiku-5-5': { entrada: 0.1, saida: 0.5 },
}

export function estimarCusto(uso: Uso): number | null {
  const p = PRECOS[uso.modelo]
  if (!p) return null
  const usd =
    (uso.tokens_entrada * p.entrada + uso.cache_escrita * p.entrada * 1.25 + uso.cache_leitura * p.entrada * 0.1 + uso.tokens_saida * p.saida) / 1_000_000
  return Math.round(usd * 10_000) / 10_000
}
