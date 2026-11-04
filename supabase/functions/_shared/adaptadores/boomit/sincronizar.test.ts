import { describe, expect, it } from 'vitest'
import { hashSha256, jsonCanonico } from './sincronizar.ts'

describe('snapshot por hash (base do R10)', () => {
  it('a ordem das chaves não muda o hash', async () => {
    const a = { b: 1, a: { d: [1, { y: 2, x: 1 }], c: 'ç' } }
    const b = { a: { c: 'ç', d: [1, { x: 1, y: 2 }] }, b: 1 }
    expect(jsonCanonico(a)).toBe(jsonCanonico(b))
    expect(await hashSha256(jsonCanonico(a))).toBe(await hashSha256(jsonCanonico(b)))
  })

  it('qualquer mudança de conteúdo muda o hash', async () => {
    const h1 = await hashSha256(jsonCanonico({ texto: 'versão 1' }))
    const h2 = await hashSha256(jsonCanonico({ texto: 'versão 2' }))
    expect(h1).not.toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })

  it('a ordem dos itens de uma lista importa', () => {
    expect(jsonCanonico([1, 2])).not.toBe(jsonCanonico([2, 1]))
  })
})
