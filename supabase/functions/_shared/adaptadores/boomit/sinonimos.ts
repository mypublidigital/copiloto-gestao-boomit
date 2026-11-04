// De-para das competências Boomit (R1). Fonte: docs/referencia-boomit-plataforma-contexto.md §4.3
// e chaves vistas nos fixtures. A migration 0002 grava estas mesmas linhas em competencia_sinonimo
// (o teste do normalizador confere que as duas listas batem).

export type CategoriaCompetencia = 'digital_crescimento' | 'taticas_estrategicas' | 'outras'

export interface Sinonimo {
  chave_normalizada: string
  competencia_canonica: string
  categoria: CategoriaCompetencia
}

/** minúsculas, sem acento, `_` → espaço, espaços colapsados (R1). */
export function normalizarChave(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// [nome canônico, categoria, variações extras já vistas na Boomit]
const CATALOGO: [string, CategoriaCompetencia, string[]][] = [
  // Digital de Crescimento (10)
  ['Inovação', 'digital_crescimento', []],
  ['Criatividade', 'digital_crescimento', []],
  ['Foco', 'digital_crescimento', []],
  ['Flexibilidade', 'digital_crescimento', []],
  ['Agilidade', 'digital_crescimento', []],
  ['Curiosidade', 'digital_crescimento', []],
  ['Construção de Planos', 'digital_crescimento', []],
  ['Riscos Calculados', 'digital_crescimento', []],
  ['Tomada de Decisão', 'digital_crescimento', []],
  ['Comunicação Objetiva', 'digital_crescimento', []],
  // Táticas Estratégicas (9)
  ['Experiência Profissional', 'taticas_estrategicas', []],
  ['Adaptabilidade', 'taticas_estrategicas', []],
  ['Resolução de Problemas', 'taticas_estrategicas', []],
  ['Conhecimento Técnico', 'taticas_estrategicas', []],
  ['Estratégia de Negócios', 'taticas_estrategicas', []],
  ['Trabalho em Equipe', 'taticas_estrategicas', []],
  ['Conhecimento do Setor', 'taticas_estrategicas', []],
  ['Compreensão Estratégica', 'taticas_estrategicas', []],
  ['Comunicação', 'taticas_estrategicas', ['Comunicacao_eficaz', 'Comunicacaoefetiva', 'Comunicação Efetiva']],
  // Outras chaves do catálogo bruto
  ['Colaboração', 'outras', []],
  ['Comunicação e Influência', 'outras', ['Comunicacao_eficaz_influencia']],
  ['Direcionamento para Resultados', 'outras', []],
  ['Gestão de Mudanças', 'outras', ['Gestao_mudancas']],
  ['Influência', 'outras', []],
  ['Melhoria Contínua', 'outras', ['Melhoria_continua']],
  ['Planejamento Estratégico', 'outras', []],
  ['Proatividade', 'outras', []],
  ['Produtividade', 'outras', []],
  ['Qualidade do Trabalho', 'outras', ['Qualidade_trabalho']],
  ['Resiliência', 'outras', []],
]

export const SINONIMOS_SEMENTE: Sinonimo[] = CATALOGO.flatMap(([canonica, categoria, extras]) => {
  const chaves = new Set([canonica, ...extras].map(normalizarChave))
  return [...chaves].map((chave_normalizada) => ({ chave_normalizada, competencia_canonica: canonica, categoria }))
})

export type MapaSinonimos = ReadonlyMap<string, Sinonimo>

export function mapaDeSinonimos(linhas: readonly Sinonimo[]): MapaSinonimos {
  return new Map(linhas.map((s) => [s.chave_normalizada, s]))
}
