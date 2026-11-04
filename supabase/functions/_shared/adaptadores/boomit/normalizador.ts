// Camada anticorrupção: payload Boomit (contrato v1) → contexto do Copiloto.
// Módulo puro (sem banco, sem rede). Regras R1–R11 em docs/02 §3.3.
// Sprint 0: R1 (competências), R5 (números e datas), R9 (seções indisponíveis) e minimização.
import type { ColaboradorBoomit, DataBruta, EmpresaBoomit, NumeroBruto, SecaoIndisponivel } from './contrato.ts'
import { type CategoriaCompetencia, type MapaSinonimos, normalizarChave } from './sinonimos.ts'

export const VERSAO_NORMALIZADOR = 1

// ---------- R5: números e datas ----------

/** Aceita número, "6.62", "-3,92" e "1.234,5". Vazio ou inválido → null. */
export function paraNumero(valor: NumeroBruto): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (typeof valor !== 'string') return null
  let s = valor.trim().replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

/** "dd/mm/aaaa" ou ISO (data ou data-hora) → "aaaa-mm-dd" ou ISO com fuso. Inválido → null. */
export function paraDataIso(valor: DataBruta): string | null {
  if (typeof valor !== 'string' || !valor.trim()) return null
  const s = valor.trim()
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (br) {
    const [, d, m, a] = br
    return dataValida(`${a}-${m}-${d}`) ? `${a}-${m}-${d}` : null
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return dataValida(s) ? s : null
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s))) return s
  return null
}

function dataValida(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso)
}

// ---------- tipos de saída ----------

export interface CompetenciaNormalizada {
  competencia: string
  categoria: CategoriaCompetencia | 'desconhecida'
  chave_original: string
  atual: number | null
  meta: number | null
  auto: number | null
  /** meta (ou esperado) − atual; positivo = abaixo da meta. */
  gap: number | null
  origem: 'digital_crescimento' | 'taticas'
}

export interface TextoPorCompetencia {
  competencia: string
  texto: string
}

export interface ContextoColaborador {
  versao_normalizador: number
  cargo: string | null
  area: string | null
  nivel: string | null
  jornada: { assessment: string | null; focus: string | null; personalidade: string | null; assessment_respondido_em: string | null } | null
  devolutiva: { data: string | null; concluida: boolean } | null
  competencias: CompetenciaNormalizada[]
  gaps_prioritarios: CompetenciaNormalizada[]
  alinhamento: { pct: number | null; rotulo: string | null; cultural: number | null; performance: number | null; engajamento: number | null; estrategico: number | null } | null
  personalidade: { tipo: string; apelido: string | null; data: string | null } | null
  potencial: { adaptabilidade: number | null; interesse: number | null; tempo_meses: number | null; esforco: string | null } | null
  perfil_hierarquico: { operacional_pct: number | null; tatico_pct: number | null; estrategico_pct: number | null; dominante: string | null } | null
  ia: { score: number | null; nivel: number | null; dimensoes: Record<string, number | null> } | null
  focus: {
    mentor: string | null
    analise_tecnica: TextoPorCompetencia[]
    analise_comportamental: TextoPorCompetencia[]
    sessoes: { data: string | null; status: string | null }[]
  } | null
  pdi_boomit: {
    gerado_em: string | null
    textos: TextoPorCompetencia[]
    pontos_chave: { titulo: string; desafio: string | null; kpi: string | null; de: string | null; para: string | null; prazo: string | null }[]
  } | null
  secoes_indisponiveis: string[]
}

export interface ContextoSensivel {
  ppl: number | null
  ppl_atualizado_em: string | null
  performance_tecnica_pct: number | null
  quadrante_matriz: string | null
  r3: { acao: string | null; confianca_pct: number | null; justificativa: string | null } | null
}

export interface ColaboradorNormalizado {
  colaborador: {
    boomit_colaborador_id: string
    email: string
    nome: string
    cargo: string | null
    area: string | null
    area_normalizada: string | null
    nivel: 'operacional' | 'tatico' | 'estrategico' | null
    diretoria: string | null
    ativo: boolean
  }
  contexto: ContextoColaborador
  sensivel: ContextoSensivel | null
  alertas: string[]
}

export interface ContextoEmpresa {
  versao_normalizador: number
  nome: string
  setor: string | null
  data_ultima_analise: string | null
  maturidade: { nota: string | null; score: number | null; rotulo: string | null; diagnostico: string | null; proxima_etapa: string | null } | null
  pontos_chave: { metrica: string; meta: string | null; desafios: string[]; risco_pct: number | null }[]
  estrategias_prioritarias: { ordem: number; titulo: string; descricao: string | null; acoes: string[] }[]
  alinhamento_medio: Record<string, number | null> | null
  ia: { score_100: number | null; nivel_centauro: number | null; nivel_rotulo: string | null; eixos: Record<string, number | null>; calculado_em: string | null } | null
  textos_ia: { chave: string; texto: string; gerado_em: string | null }[]
  secoes_indisponiveis: string[]
}

// ---------- utilitários ----------

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

const numeros = (o: Record<string, NumeroBruto> | undefined): Record<string, number | null> =>
  Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, paraNumero(v)]))

/** R9: cada seção é normalizada isolada; se falhar ou vier marcada indisponível, vira null + alerta. */
function criarSecoes(indisponiveis: SecaoIndisponivel[] | undefined, alertas: string[]) {
  const marcadas = new Set((indisponiveis ?? []).map((s) => s.secao))
  for (const s of indisponiveis ?? []) alertas.push(`secao_indisponivel:${s.secao}${s.motivo ? ` (${s.motivo})` : ''}`)
  const lista = new Set(marcadas)
  return {
    secao<T>(nome: string, presente: boolean, fn: () => T): T | null {
      if (marcadas.has(nome) || !presente) return null
      try {
        return fn()
      } catch (erro) {
        lista.add(nome)
        alertas.push(`secao_com_erro:${nome} (${erro instanceof Error ? erro.message : String(erro)})`)
        return null
      }
    },
    indisponiveis: () => [...lista].sort(),
  }
}

/** R1: chave bruta → nome canônico. Chave desconhecida gera alerta, não erro. */
export function mapearCompetencia(chave: string, sinonimos: MapaSinonimos, alertas: string[]) {
  const s = sinonimos.get(normalizarChave(chave))
  if (s) return { competencia: s.competencia_canonica, categoria: s.categoria }
  alertas.push(`competencia_desconhecida:${chave}`)
  return { competencia: chave.trim(), categoria: 'desconhecida' as const }
}

function textosPorCompetencia(o: Record<string, string> | undefined, sinonimos: MapaSinonimos, alertas: string[]): TextoPorCompetencia[] {
  return Object.entries(o ?? {})
    .filter(([, t]) => texto(t))
    .map(([chave, t]) => ({ competencia: mapearCompetencia(chave, sinonimos, alertas).competencia, texto: t.trim() }))
}

function dataComAlerta(valor: DataBruta, campo: string, alertas: string[]): string | null {
  const iso = paraDataIso(valor)
  if (valor && !iso) alertas.push(`data_invalida:${campo}=${valor}`)
  return iso
}

const subtrair = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round((a - b) * 100) / 100)

// ---------- colaborador ----------

export function normalizarColaborador(c: ColaboradorBoomit, sinonimos: MapaSinonimos): ColaboradorNormalizado {
  const alertas: string[] = []
  const { secao, indisponiveis } = criarSecoes(c.secoes_indisponiveis, alertas)

  const comportamentais = secao('digital_crescimento', Boolean(c.digital_crescimento), () =>
    (c.digital_crescimento ?? []).map((d): CompetenciaNormalizada => {
      const atual = paraNumero(d.atual)
      const meta = paraNumero(d.meta)
      return { ...mapearCompetencia(d.competencia, sinonimos, alertas), chave_original: d.competencia, atual, meta, auto: paraNumero(d.auto), gap: subtrair(meta, atual), origem: 'digital_crescimento' }
    }),
  ) ?? []

  const taticas = secao('taticas', Boolean(c.taticas), () =>
    (c.taticas ?? []).map((t): CompetenciaNormalizada => {
      const atual = paraNumero(t.atual)
      const meta = paraNumero(t.esperado)
      return { ...mapearCompetencia(t.competencia, sinonimos, alertas), chave_original: t.competencia, atual, meta, auto: null, gap: subtrair(meta, atual), origem: 'taticas' }
    }),
  ) ?? []

  const competencias = [...comportamentais, ...taticas]
  const gaps_prioritarios = competencias
    .filter((k) => (k.gap ?? 0) > 0)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0) || a.competencia.localeCompare(b.competencia, 'pt-BR'))
    .slice(0, 5)

  const contexto: ContextoColaborador = {
    versao_normalizador: VERSAO_NORMALIZADOR,
    cargo: texto(c.cargo),
    area: texto(c.area),
    nivel: c.nivel ?? null,
    jornada: secao('jornada', Boolean(c.jornada), () => ({
      assessment: texto(c.jornada?.assessment),
      focus: texto(c.jornada?.focus),
      personalidade: texto(c.jornada?.personalidade),
      assessment_respondido_em: dataComAlerta(c.jornada?.assessment_respondido_em, 'jornada.assessment_respondido_em', alertas),
    })),
    devolutiva: secao('devolutiva', Boolean(c.devolutiva), () => ({
      data: dataComAlerta(c.devolutiva?.data, 'devolutiva.data', alertas),
      concluida: c.devolutiva?.concluida === true,
    })),
    competencias,
    gaps_prioritarios,
    alinhamento: secao('alinhamento', Boolean(c.alinhamento), () => ({
      pct: paraNumero(c.alinhamento?.pct),
      rotulo: texto(c.alinhamento?.rotulo),
      cultural: paraNumero(c.alinhamento?.cultural),
      performance: paraNumero(c.alinhamento?.performance),
      engajamento: paraNumero(c.alinhamento?.engajamento),
      estrategico: paraNumero(c.alinhamento?.estrategico),
    })),
    personalidade: secao('personalidade', Boolean(c.personalidade?.tipo), () => ({
      tipo: (c.personalidade?.tipo ?? '').trim(),
      apelido: texto(c.personalidade?.apelido),
      data: dataComAlerta(c.personalidade?.data, 'personalidade.data', alertas),
    })),
    potencial: secao('potencial', Boolean(c.potencial), () => ({
      adaptabilidade: paraNumero(c.potencial?.adaptabilidade),
      interesse: paraNumero(c.potencial?.interesse),
      tempo_meses: paraNumero(c.potencial?.tempo_meses),
      esforco: texto(c.potencial?.esforco),
    })),
    perfil_hierarquico: secao('perfil_hierarquico', Boolean(c.perfil_hierarquico), () => ({
      operacional_pct: paraNumero(c.perfil_hierarquico?.operacional_pct),
      tatico_pct: paraNumero(c.perfil_hierarquico?.tatico_pct),
      estrategico_pct: paraNumero(c.perfil_hierarquico?.estrategico_pct),
      dominante: texto(c.perfil_hierarquico?.dominante),
    })),
    ia: secao('ia', Boolean(c.ia), () => {
      const { score, nivel, ...dimensoes } = c.ia ?? {}
      return { score: paraNumero(score), nivel: paraNumero(nivel), dimensoes: numeros(dimensoes) }
    }),
    focus: secao('focus', Boolean(c.focus), () => ({
      mentor: texto(c.focus?.mentor?.nome),
      analise_tecnica: textosPorCompetencia(c.focus?.analise_tecnica, sinonimos, alertas),
      analise_comportamental: textosPorCompetencia(c.focus?.analise_comportamental, sinonimos, alertas),
      sessoes: (c.focus?.sessoes ?? []).map((s, i) => ({ data: dataComAlerta(s.data, `focus.sessoes[${i}].data`, alertas), status: texto(s.status) })),
    })),
    pdi_boomit: secao('pdi_boomit', Boolean(c.pdi_boomit), () => ({
      gerado_em: dataComAlerta(c.pdi_boomit?.gerado_em, 'pdi_boomit.gerado_em', alertas),
      textos: textosPorCompetencia(c.pdi_boomit?.textos, sinonimos, alertas),
      pontos_chave: (c.pdi_boomit?.pontos_chave ?? []).map((p) => ({
        titulo: p.titulo,
        desafio: texto(p.desafio),
        kpi: texto(p.kpi),
        de: texto(p.de),
        para: texto(p.para),
        prazo: texto(p.prazo),
      })),
    })),
    secoes_indisponiveis: [],
  }

  const sensivel = secao('indicadores_sensiveis', Boolean(c.indicadores_sensiveis), (): ContextoSensivel => {
    const s = c.indicadores_sensiveis ?? {}
    return {
      ppl: paraNumero(s.ppl),
      ppl_atualizado_em: dataComAlerta(s.ppl_atualizado_em, 'indicadores_sensiveis.ppl_atualizado_em', alertas),
      performance_tecnica_pct: paraNumero(s.performance_tecnica_pct),
      quadrante_matriz: texto(s.quadrante_matriz),
      r3: s.r3 ? { acao: texto(s.r3.acao), confianca_pct: paraNumero(s.r3.confianca_pct), justificativa: texto(s.r3.justificativa) } : null,
    }
  })

  contexto.secoes_indisponiveis = indisponiveis()

  // Minimização: salário, gênero e celular nunca saem daqui (não são lidos).
  return {
    colaborador: {
      boomit_colaborador_id: c.id,
      email: c.email.trim().toLowerCase(),
      nome: c.nome.trim(),
      cargo: texto(c.cargo),
      area: texto(c.area),
      area_normalizada: c.area ? normalizarChave(c.area) : null, // R6 completo na Sprint 1
      nivel: c.nivel ?? null,
      diretoria: texto(c.diretoria),
      ativo: c.ativo !== false,
    },
    contexto,
    sensivel,
    alertas,
  }
}

// ---------- empresa ----------

export function normalizarEmpresa(e: EmpresaBoomit): { contexto: ContextoEmpresa; alertas: string[] } {
  const alertas: string[] = []
  const { secao, indisponiveis } = criarSecoes(e.secoes_indisponiveis, alertas)
  const contexto: ContextoEmpresa = {
    versao_normalizador: VERSAO_NORMALIZADOR,
    nome: e.nome_fantasia.trim(),
    setor: texto(e.setor),
    data_ultima_analise: dataComAlerta(e.data_ultima_analise, 'data_ultima_analise', alertas),
    maturidade: secao('maturidade', Boolean(e.maturidade), () => ({
      nota: texto(e.maturidade?.nota),
      score: paraNumero(e.maturidade?.score),
      rotulo: texto(e.maturidade?.rotulo),
      diagnostico: texto(e.maturidade?.diagnostico),
      proxima_etapa: texto(e.maturidade?.proxima_etapa),
    })),
    pontos_chave:
      secao('pontos_chave', Boolean(e.pontos_chave), () =>
        (e.pontos_chave ?? []).map((p) => ({ metrica: p.metrica, meta: texto(p.meta), desafios: p.desafios ?? [], risco_pct: paraNumero(p.risco_pct) })),
      ) ?? [],
    estrategias_prioritarias:
      secao('estrategias_prioritarias', Boolean(e.estrategias_prioritarias), () =>
        (e.estrategias_prioritarias ?? []).map((s) => ({ ordem: s.ordem, titulo: s.titulo, descricao: texto(s.descricao), acoes: s.acoes ?? [] })),
      ) ?? [],
    alinhamento_medio: secao('alinhamento_medio', Boolean(e.alinhamento_medio), () => numeros(e.alinhamento_medio)),
    ia: secao('ia', Boolean(e.ia), () => ({
      score_100: paraNumero(e.ia?.score_100),
      nivel_centauro: paraNumero(e.ia?.nivel_centauro),
      nivel_rotulo: texto(e.ia?.nivel_rotulo),
      eixos: numeros(e.ia?.eixos),
      calculado_em: dataComAlerta(e.ia?.calculado_em, 'ia.calculado_em', alertas),
    })),
    textos_ia:
      secao('textos_ia', Boolean(e.textos_ia), () =>
        Object.entries(e.textos_ia ?? {}).map(([chave, t]) => ({ chave, texto: t.texto, gerado_em: dataComAlerta(t.gerado_em, `textos_ia.${chave}.gerado_em`, alertas) })),
      ) ?? [],
    secoes_indisponiveis: [],
  }
  contexto.secoes_indisponiveis = indisponiveis()
  // Minimização: e.financeiro nunca é lido (Fase 2).
  return { contexto, alertas }
}
