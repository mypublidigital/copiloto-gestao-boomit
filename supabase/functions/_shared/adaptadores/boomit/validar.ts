// Valida um payload contra o contrato v1 (JSON Schema 2020-12).
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import contrato from '../../../../../contracts/boomit-export.v1.schema.json' with { type: 'json' }
import type { PayloadBoomitV1 } from './contrato.ts'

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validarContrato = ajv.compile(contrato)

export class ContratoInvalidoError extends Error {
  readonly erros: string[]
  constructor(erros: string[]) {
    super(`Payload fora do contrato v1: ${erros.slice(0, 5).join('; ')}`)
    this.erros = erros
  }
}

export function validarPayload(payload: unknown): PayloadBoomitV1 {
  if (validarContrato(payload)) return payload as unknown as PayloadBoomitV1
  const erros = (validarContrato.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'inválido'}`)
  throw new ContratoInvalidoError(erros)
}
