// ModeloSimulado: implementação de ClienteModelo para testes (sem rede, sem custo).
// Cada resposta é uma função da chamada, para os testes conferirem o que o motor enviou.
import type { ChamadaConversa, ChamadaEstruturada, ClienteModelo, Uso } from './modelo.ts'

type Resposta = (chamada: ChamadaEstruturada<unknown> | ChamadaConversa) => unknown

export class ModeloSimulado implements ClienteModelo {
  readonly chamadas: (ChamadaEstruturada<unknown> | ChamadaConversa)[] = []
  private readonly respostas: Record<string, Resposta>

  /** `respostas` por finalidade (classificacao, preparacao, simulacao, debrief…). */
  constructor(respostas: Record<string, Resposta>) {
    this.respostas = respostas
  }

  private uso(modelo: string): Uso {
    return { modelo, tokens_entrada: 1000, tokens_saida: 200, cache_leitura: 0, cache_escrita: 0, latencia_ms: 1 }
  }

  private responder(chamada: ChamadaEstruturada<unknown> | ChamadaConversa): unknown {
    this.chamadas.push(chamada)
    const r = this.respostas[chamada.finalidade]
    if (!r) throw new Error(`ModeloSimulado sem resposta para "${chamada.finalidade}"`)
    return r(chamada)
  }

  async gerar<T>(chamada: ChamadaEstruturada<T>): Promise<{ dados: T; uso: Uso }> {
    const dados = chamada.schema.parse(this.responder(chamada as ChamadaEstruturada<unknown>))
    return { dados, uso: this.uso(chamada.modelo) }
  }

  async conversar(chamada: ChamadaConversa): Promise<{ texto: string; uso: Uso }> {
    const texto = String(this.responder(chamada))
    for (const pedaco of texto.match(/.{1,20}/gs) ?? []) chamada.aoTexto?.(pedaco)
    return { texto, uso: this.uso(chamada.modelo) }
  }
}
