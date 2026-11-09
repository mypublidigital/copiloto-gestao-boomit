// Leitura das frentes de gestão: tudo pelo JWT do líder (a RLS decide o que aparece).
import type { Vinculo } from '@/auth/sessao'
import { type ContextoColaborador, lerContexto } from '@/dominio/contexto'
import { supabase } from '@/lib/supabase'
import { exigir } from '@/lib/useConsulta'

export interface Pessoa {
  id: string
  nome: string
  cargo: string | null
  area: string | null
  contexto: ContextoColaborador | null
}

export interface ContextoEmpresa {
  nome?: string
  maturidade?: { nota: string | null; rotulo: string | null; diagnostico: string | null; proxima_etapa: string | null } | null
  pontos_chave?: { metrica: string; meta: string | null; desafios: string[] }[]
  estrategias_prioritarias?: { ordem: number; titulo: string; descricao: string | null; acoes: string[] }[]
  alinhamento_medio?: Record<string, number | null> | null
}

export async function carregarFrentes(v: Vinculo) {
  const lider = v.colaborador_id!
  const vinculos = exigir(await supabase.from('vinculo_lideranca').select('liderado_id').eq('lider_id', lider).is('fim', null))
  const ids = vinculos.map((x) => x.liderado_id)
  const filtroIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000']
  const [pessoas, eu, situacoes, registros, combinados, acoes, compromissos, decisoes, alcadas, empresa, ctxEmpresa, mentoria] = await Promise.all([
    supabase.from('colaborador').select('id, nome, cargo, area, contexto_colaborador(dados)').in('id', filtroIds).order('nome'),
    supabase.from('colaborador').select('id, nome, cargo, area, nivel, contexto_colaborador(dados)').eq('id', lider).maybeSingle(),
    supabase.from('situacao').select('id, titulo, tipo, frente, status, sensivel, colaborador_id, criado_em, aplicada_em').eq('lider_id', lider).order('criado_em', { ascending: false }),
    supabase.from('registro').select('id, tipo, texto, data_fato, visibilidade, colaborador_id').in('colaborador_id', filtroIds).order('data_fato', { ascending: false }).limit(200),
    supabase.from('combinado').select('id, descricao, status, prazo, colaborador_id, concluido_em, origem').eq('lider_id', lider).neq('status', 'cancelado'),
    supabase.from('acao_desenvolvimento').select('id, descricao, competencia, prazo, status, origem, colaborador_id').in('colaborador_id', filtroIds).order('prazo'),
    supabase.from('compromisso').select('id, titulo, tipo, status, inicio, realizado_em, colaborador_id').order('inicio', { ascending: false }).limit(300),
    supabase.from('decisao').select('id, titulo, status, prazo_decisao, revisar_em, opcao_escolhida').order('criado_em', { ascending: false }),
    supabase.from('alcada').select('id, nivel, cargo_referencia, pode_decidir, limites, consultar').eq('empresa_id', v.empresa_id).eq('ativo', true),
    supabase.from('empresa').select('nome, config').eq('id', v.empresa_id).maybeSingle(),
    supabase.from('contexto_empresa').select('dados').eq('empresa_id', v.empresa_id).maybeSingle(),
    supabase.from('mentoria').select('ativo').eq('lider_id', lider).eq('ativo', true),
  ])
  const config = (exigir(empresa)?.config ?? {}) as { canais_encaminhamento?: Record<string, string>; modo_pdi?: string }
  const meu = exigir(eu)
  return {
    pessoas: exigir(pessoas).map((p): Pessoa => ({ id: p.id, nome: p.nome, cargo: p.cargo, area: p.area, contexto: lerContexto(p.contexto_colaborador?.dados) })),
    eu: meu ? { ...meu, contexto: lerContexto(meu.contexto_colaborador?.dados) } : null,
    situacoes: exigir(situacoes),
    registros: exigir(registros),
    combinados: exigir(combinados),
    acoes: exigir(acoes),
    compromissos: exigir(compromissos),
    decisoes: exigir(decisoes),
    alcadas: exigir(alcadas),
    canais: config.canais_encaminhamento ?? {},
    modoPdi: config.modo_pdi ?? 'boomit',
    empresa: (ctxEmpresa.data?.dados ?? null) as ContextoEmpresa | null,
    temMentoria: (mentoria.data ?? []).length > 0,
  }
}

export type DadosFrentes = Awaited<ReturnType<typeof carregarFrentes>>
