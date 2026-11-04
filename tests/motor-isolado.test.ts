// Garante que o motor de IA continua genérico (CLAUDE.md, "Motor compartilhado").
// Falha se algum arquivo de motor/ mencionar a Boomit ou importar adaptadores ou o app.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ_MOTOR = path.resolve(import.meta.dirname, '../supabase/functions/_shared/motor')

function arquivosDoMotor(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = path.join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivosDoMotor(caminho)
    return /\.(ts|tsx|js|mjs|json|md)$/.test(nome) ? [caminho] : []
  })
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

export function violacoes(conteudo: string): string[] {
  const erros: string[] = []
  if (/boomit/i.test(conteudo)) erros.push('menciona "boomit"')
  for (const m of conteudo.matchAll(IMPORT_RE)) {
    const alvo = m[1] ?? m[2] ?? ''
    if (/adaptadores/.test(alvo)) erros.push(`importa adaptador: ${alvo}`)
    if (/(^|\/)src\/|^@\//.test(alvo)) erros.push(`importa o app: ${alvo}`)
  }
  return erros
}

describe('motor-isolado', () => {
  const arquivos = arquivosDoMotor(RAIZ_MOTOR)

  it('encontra os arquivos do motor', () => {
    expect(arquivos.length).toBeGreaterThan(0)
  })

  it.each(arquivos.map((a) => [path.relative(RAIZ_MOTOR, a), a]))('%s não depende da Boomit, de adaptadores nem do app', (_nome, arquivo) => {
    expect(violacoes(readFileSync(arquivo, 'utf8'))).toEqual([])
  })

  it('o detector pega as violações (teste do próprio teste)', () => {
    expect(violacoes("import { x } from '../adaptadores/boomit/index.ts'")).toHaveLength(2)
    expect(violacoes("import { y } from '@/lib/utils'")).toEqual(['importa o app: @/lib/utils'])
    expect(violacoes("const fonte = 'Boomit'")).toEqual(['menciona "boomit"'])
  })
})
