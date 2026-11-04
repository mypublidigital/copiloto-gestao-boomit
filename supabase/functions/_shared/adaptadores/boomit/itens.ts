// Tradução do contexto do Copiloto (contexto_* normalizado da Boomit, registros e combinados)
// para ItemDeContexto, a única coisa que o motor entende. Cada item ganha fonte_id estável e
// um rótulo legível para a citação. A ordem dentro da camada é a prioridade: o pacote corta
// do fim para o começo quando o contexto estoura.
import { CAMADAS, type ItemDeContexto } from '../../motor/contexto.ts'
import type { ContextoColaborador, ContextoEmpresa } from './normalizador.ts'

export const NIVEIS_IA: Record<number, string> = { 1: 'Explorador', 2: 'Aprendiz', 3: 'Usuário', 4: 'Aplicador', 5: 'Catalisador' }

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function itensDaEmpresa(ctx: ContextoEmpresa | null): ItemDeContexto[] {
  if (!ctx) return []
  const itens: ItemDeContexto[] = []
  const camada = CAMADAS.organizacao
  if (ctx.maturidade) {
    const m = ctx.maturidade
    itens.push({
      fonte_id: 'boomit:empresa:maturidade',
      rotulo: 'Resumo Estratégico Boomit · Maturidade',
      camada,
      data: ctx.data_ultima_analise,
      conteudo: [`Maturidade ${m.nota ?? '—'}${m.rotulo ? ` (${m.rotulo})` : ''}.`, m.diagnostico, m.proxima_etapa ? `Próxima etapa: ${m.proxima_etapa}` : null].filter(Boolean).join(' '),
    })
  }
  for (const e of ctx.estrategias_prioritarias.slice(0, 3)) {
    itens.push({
      fonte_id: `boomit:empresa:estrategia:${e.ordem}`,
      rotulo: `Estratégia prioritária #${e.ordem} · ${e.titulo}`,
      camada,
      data: ctx.data_ultima_analise,
      conteudo: [e.descricao, e.acoes.length ? `Ações: ${e.acoes.join('; ')}.` : null].filter(Boolean).join(' '),
    })
  }
  for (const p of ctx.pontos_chave.slice(0, 3)) {
    itens.push({
      fonte_id: `boomit:empresa:ponto-chave:${slug(p.metrica)}`,
      rotulo: `Ponto-chave da empresa · ${p.metrica}`,
      camada,
      data: ctx.data_ultima_analise,
      conteudo: [p.meta ? `Meta: ${p.meta}.` : null, p.desafios.length ? `Desafios: ${p.desafios.join('; ')}.` : null].filter(Boolean).join(' '),
    })
  }
  return itens
}

export interface PessoaBasica {
  id: string
  nome: string
  cargo: string | null
  area: string | null
}

export function itensDaPessoa(pessoa: PessoaBasica, ctx: ContextoColaborador | null): ItemDeContexto[] {
  const camada = CAMADAS.pessoa
  const base = `boomit:colaborador:${pessoa.id}`
  const itens: ItemDeContexto[] = [
    {
      fonte_id: `${base}:cadastro`,
      rotulo: `Cadastro · ${pessoa.nome}`,
      camada,
      data: null,
      conteudo: [`${pessoa.nome}`, pessoa.cargo, pessoa.area].filter(Boolean).join(' · '),
    },
  ]
  if (!ctx) return itens

  for (const g of ctx.gaps_prioritarios) {
    itens.push({
      fonte_id: `${base}:gap:${slug(g.competencia)}`,
      rotulo: `Assessment Boomit · ${g.competencia}`,
      camada,
      data: ctx.jornada?.assessment_respondido_em ?? null,
      conteudo: `Nota atual ${g.atual ?? '—'}, meta ${g.meta ?? '—'} (diferença de ${g.gap ?? '—'}). Bloco: ${g.origem === 'taticas' ? 'Táticas Estratégicas' : 'Digital de Crescimento'}.`,
    })
  }
  for (const p of ctx.pdi_boomit?.pontos_chave ?? []) {
    itens.push({
      fonte_id: `${base}:pdi:${slug(p.titulo)}`,
      rotulo: `PDI Boomit · ${p.titulo}`,
      camada,
      data: ctx.pdi_boomit?.gerado_em ?? null,
      conteudo: [p.desafio, p.kpi ? `KPI: ${p.kpi}${p.de || p.para ? ` (${p.de ?? '?'} → ${p.para ?? '?'})` : ''}${p.prazo ? `, prazo ${p.prazo}` : ''}.` : null].filter(Boolean).join(' '),
    })
  }
  // Pareceres Focus: primeiro os das competências com maior gap.
  const emGap = new Set(ctx.gaps_prioritarios.map((g) => g.competencia))
  const dataFocus = ctx.focus?.sessoes.map((s) => s.data).filter(Boolean).sort().at(-1) ?? null
  const pareceres = [
    ...(ctx.focus?.analise_comportamental ?? []).map((a) => ({ ...a, tipo: 'comportamental' })),
    ...(ctx.focus?.analise_tecnica ?? []).map((a) => ({ ...a, tipo: 'técnica' })),
  ].sort((a, b) => Number(emGap.has(b.competencia)) - Number(emGap.has(a.competencia)))
  for (const a of pareceres) {
    itens.push({
      fonte_id: `${base}:focus:${slug(a.tipo)}:${slug(a.competencia)}`,
      rotulo: `Parecer Focus (${a.tipo}) · ${a.competencia}`,
      camada,
      data: dataFocus,
      conteudo: a.texto,
    })
  }
  if (ctx.alinhamento?.pct != null) {
    const a = ctx.alinhamento
    itens.push({
      fonte_id: `${base}:alinhamento`,
      rotulo: 'Alinhamento de propósito · Boomit',
      camada,
      data: null,
      conteudo: `${a.pct}%${a.rotulo ? ` (${a.rotulo})` : ''}. Cultural ${a.cultural ?? '—'}, performance ${a.performance ?? '—'}, engajamento ${a.engajamento ?? '—'}, estratégico ${a.estrategico ?? '—'}.`,
    })
  }
  if (ctx.ia?.nivel != null) {
    itens.push({
      fonte_id: `${base}:ia`,
      rotulo: 'Maturidade em IA · Boomit',
      camada,
      data: null,
      conteudo: `Nível N${ctx.ia.nivel} (${NIVEIS_IA[ctx.ia.nivel] ?? '—'})${ctx.ia.score != null ? `, score ${ctx.ia.score}/10` : ''}.`,
    })
  }
  if (ctx.personalidade) {
    itens.push({
      fonte_id: `${base}:personalidade`,
      rotulo: '16 Personalidades · referência',
      camada,
      data: ctx.personalidade.data,
      conteudo: `Tipo ${ctx.personalidade.tipo}${ctx.personalidade.apelido ? ` (${ctx.personalidade.apelido})` : ''}. Use só como referência para a abordagem; não explica comportamento.`,
    })
  }
  return itens
}

export interface RegistroBasico {
  id: string
  tipo: string
  texto: string
  data_fato: string
  visibilidade: string
}

export interface CombinadoBasico {
  id: string
  descricao: string
  status: string
  prazo: string | null
}

export function itensDoHistorico(registros: RegistroBasico[], combinados: CombinadoBasico[], hoje = new Date()): ItemDeContexto[] {
  const camada = CAMADAS.historico
  const limite = new Date(hoje.getTime() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const hojeIso = hoje.toISOString().slice(0, 10)
  const itensCombinados = combinados
    .filter((c) => c.status === 'aberto' || c.status === 'renegociado')
    .map((c) => {
      const vencido = c.prazo !== null && c.prazo < hojeIso
      return {
        fonte_id: `copiloto:combinado:${c.id}`,
        rotulo: `Combinado ${vencido ? 'vencido' : 'aberto'}${c.prazo ? ` · prazo ${c.prazo}` : ''}`,
        camada,
        data: c.prazo,
        conteudo: c.descricao,
      } satisfies ItemDeContexto
    })
  const itensRegistros = registros
    .filter((r) => r.data_fato >= limite)
    .sort((a, b) => b.data_fato.localeCompare(a.data_fato))
    .map(
      (r) =>
        ({
          fonte_id: `copiloto:registro:${r.id}`,
          rotulo: `Registro do líder · ${r.tipo}`,
          camada,
          data: r.data_fato,
          conteudo: r.texto,
        }) satisfies ItemDeContexto,
    )
  return [...itensCombinados, ...itensRegistros]
}

export interface AlcadaBasica {
  id: string
  nivel: string | null
  cargo_referencia: string | null
  pode_decidir: string
  limites: string | null
  consultar: string | null
}

const NOME_NIVEL: Record<string, string> = { operacional: 'operacional', tatico: 'tático', estrategico: 'estratégico' }

/** Camada 1: alçadas do nível do líder (e as gerais, sem nível). Citáveis e nunca cortadas. */
export function itensDasAlcadas(alcadas: AlcadaBasica[], nivelLider: string | null): ItemDeContexto[] {
  return alcadas
    .filter((a) => a.nivel === null || a.nivel === nivelLider)
    .map((a) => ({
      fonte_id: `copiloto:alcada:${a.id}`,
      rotulo: `Alçada${a.nivel ? ` · nível ${NOME_NIVEL[a.nivel] ?? a.nivel}` : ''}${a.cargo_referencia ? ` · ${a.cargo_referencia}` : ''}`,
      camada: CAMADAS.politicas_e_alcadas,
      data: null,
      conteudo: [`Pode decidir sozinho: ${a.pode_decidir}`, a.limites ? `Limites: ${a.limites}` : null, a.consultar ? `Acima do limite, consultar: ${a.consultar}` : null]
        .filter(Boolean)
        .join(' '),
    }))
}
