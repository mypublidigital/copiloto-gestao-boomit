// ClienteModelo sobre a API da Anthropic (SDK oficial @anthropic-ai/sdk).
// - Saída estruturada por output_config.format (JSON Schema gerado do zod) e validada com zod:
//   os modelos atuais não aceitam forçar ferramenta (tool_choice any/tool).
// - Cache de prompt nos blocos de sistema marcados (camadas estáveis).
// - Recusa por segurança: fallbacks "default" no servidor quando o modelo aceita; se a cadeia
//   inteira recusar, lança RecusaDoModeloError.
import Anthropic from '@anthropic-ai/sdk'
import type { BetaMessage, BetaMessageParam, BetaTextBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import {
  type BlocoSistema,
  type ChamadaConversa,
  type ChamadaEstruturada,
  type ClienteModelo,
  type Mensagem,
  RecusaDoModeloError,
  SaidaInvalidaError,
  type Uso,
} from './modelo.ts'
import { jsonSchemaDe } from './saida.ts'

const BETA_FALLBACK = 'server-side-fallback-2026-07-01'

/** Haiku não tem fallback no servidor (a API recusa o parâmetro em lista e ignora "default"). */
const aceitaFallback = (modelo: string) => /^claude-(opus|sonnet)-/.test(modelo)

const sistema = (blocos: BlocoSistema[]): BetaTextBlockParam[] =>
  blocos.map((b) => ({ type: 'text', text: b.texto, ...(b.cache ? { cache_control: { type: 'ephemeral' } } : {}) }))

const mensagens = (m: Mensagem[]): BetaMessageParam[] => m.map((x) => ({ role: x.papel, content: x.texto }))

function uso(resposta: BetaMessage, inicio: number): Uso {
  return {
    modelo: resposta.model,
    tokens_entrada: resposta.usage.input_tokens,
    tokens_saida: resposta.usage.output_tokens,
    cache_leitura: resposta.usage.cache_read_input_tokens ?? 0,
    cache_escrita: resposta.usage.cache_creation_input_tokens ?? 0,
    latencia_ms: Date.now() - inicio,
  }
}

function textoDe(resposta: BetaMessage): string {
  if (resposta.stop_reason === 'refusal') throw new RecusaDoModeloError(resposta.stop_details?.category ?? null)
  return resposta.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
}

export class ClienteAnthropic implements ClienteModelo {
  private readonly api: Anthropic

  constructor(apiKey: string) {
    this.api = new Anthropic({ apiKey })
  }

  private extras(modelo: string, comFallback: boolean | undefined) {
    return comFallback && aceitaFallback(modelo) ? { betas: [BETA_FALLBACK], fallbacks: 'default' as const } : {}
  }

  async gerar<T>(c: ChamadaEstruturada<T>): Promise<{ dados: T; uso: Uso }> {
    const inicio = Date.now()
    const resposta = await this.api.beta.messages.create({
      model: c.modelo,
      max_tokens: c.maxTokens ?? 16_000,
      system: sistema(c.sistema),
      messages: mensagens(c.mensagens),
      output_config: { format: { type: 'json_schema', schema: jsonSchemaDe(c.schema) }, ...(c.esforco ? { effort: c.esforco } : {}) },
      ...this.extras(c.modelo, c.comFallback),
    })
    const texto = textoDe(resposta)
    if (resposta.stop_reason === 'max_tokens') throw new SaidaInvalidaError(`${c.finalidade}: resposta cortada pelo limite de tokens`)
    let json: unknown
    try {
      json = JSON.parse(texto)
    } catch {
      throw new SaidaInvalidaError(`${c.finalidade}: a resposta não é JSON válido`)
    }
    const validado = c.schema.safeParse(json)
    if (!validado.success) throw new SaidaInvalidaError(`${c.finalidade}: saída fora do schema (${validado.error.issues[0]?.message ?? ''})`)
    return { dados: validado.data, uso: uso(resposta, inicio) }
  }

  async conversar(c: ChamadaConversa): Promise<{ texto: string; uso: Uso }> {
    const inicio = Date.now()
    const stream = this.api.beta.messages.stream({
      model: c.modelo,
      max_tokens: c.maxTokens ?? 4_000,
      system: sistema(c.sistema),
      messages: mensagens(c.mensagens),
      ...(c.esforco ? { output_config: { effort: c.esforco } } : {}),
      ...this.extras(c.modelo, c.comFallback),
    })
    if (c.aoTexto) stream.on('text', c.aoTexto)
    const final = await stream.finalMessage()
    return { texto: textoDe(final), uso: uso(final, inicio) }
  }
}
