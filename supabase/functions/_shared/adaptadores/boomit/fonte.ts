// FonteBoomit: de onde vêm os dados da Boomit. A troca mock ↔ API é só por BOOMIT_FONTE.
import type { PayloadBoomitV1 } from './contrato.ts'
import fixture from '../../../../../fixtures/boomit/empresa-exemplo.v1.json' with { type: 'json' }
import { validarPayload } from './validar.ts'

export interface ParametrosBusca {
  /** Id da empresa na Boomit; a FonteMock ignora (só tem uma empresa). */
  empresaBoomitId?: string
  /** Só alterações a partir desta data (ISO 8601). */
  desde?: string
}

export interface FonteBoomit {
  readonly nome: 'mock' | 'api'
  buscar(parametros: ParametrosBusca): Promise<PayloadBoomitV1>
}

/** Lê fixtures/boomit/empresa-exemplo.v1.json (dados fictícios) e valida contra o contrato. */
export class FonteMock implements FonteBoomit {
  readonly nome = 'mock' as const
  buscar(): Promise<PayloadBoomitV1> {
    // Cópia profunda: quem consome pode alterar o objeto sem afetar a próxima leitura.
    return Promise.resolve(validarPayload(structuredClone(fixture)))
  }
}

/** Edge Function copiloto-export da Boomit. Entra na Sprint 1. */
export class FonteApi implements FonteBoomit {
  readonly nome = 'api' as const
  buscar(): Promise<PayloadBoomitV1> {
    return Promise.reject(new Error('FonteApi ainda não implementada (Sprint 1). Use BOOMIT_FONTE=mock.'))
  }
}

export function criarFonte(valor: string | undefined): FonteBoomit {
  switch (valor ?? 'mock') {
    case 'mock':
      return new FonteMock()
    case 'api':
      return new FonteApi()
    default:
      throw new Error(`BOOMIT_FONTE inválida: "${valor}" (use mock ou api)`)
  }
}
