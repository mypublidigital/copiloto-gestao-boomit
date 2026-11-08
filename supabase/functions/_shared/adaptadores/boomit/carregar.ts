// Carrega o contexto de uma pessoa para o motor, com o cliente do USUÁRIO (JWT):
// a RLS decide o que entra no prompt (CLAUDE.md, "Regras de dados").
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemDeContexto } from '../../motor/contexto.ts'
import type { Database } from '../../tipos/banco.ts'
import { itensDaEmpresa, itensDaPessoa, itensDasAlcadas, itensDeReunioes, itensDoHistorico, type TrechoBasico, termosDeBusca } from './itens.ts'
import type { ContextoColaborador, ContextoEmpresa } from './normalizador.ts'

type Db = SupabaseClient<Database>

export interface ContextoDaPessoa {
  pessoa: { id: string; nome: string; cargo: string | null; area: string | null; empresa_id: string }
  itens: ItemDeContexto[]
}

/** null quando a pessoa não está na visão do usuário. Com liderId, inclui as alçadas do nível do líder. */
export async function carregarContextoDaPessoa(db: Db, colaboradorId: string, liderId: string | null = null, relato: string | null = null): Promise<ContextoDaPessoa | null> {
  const pessoa = await db.from('colaborador').select('id, nome, cargo, area, empresa_id, contexto_colaborador(dados)').eq('id', colaboradorId).maybeSingle()
  if (pessoa.error) throw new Error(`ler colaborador: ${pessoa.error.message}`)
  if (!pessoa.data) return null
  const p = pessoa.data

  const [empresa, registros, combinados, alcadas, lider] = await Promise.all([
    db.from('contexto_empresa').select('dados').eq('empresa_id', p.empresa_id).maybeSingle(),
    db.from('registro').select('id, tipo, texto, data_fato, visibilidade').eq('colaborador_id', colaboradorId).order('data_fato', { ascending: false }).limit(20),
    db.from('combinado').select('id, descricao, status, prazo').eq('colaborador_id', colaboradorId).in('status', ['aberto', 'renegociado']).limit(20),
    db.from('alcada').select('id, nivel, cargo_referencia, pode_decidir, limites, consultar').eq('empresa_id', p.empresa_id).eq('ativo', true),
    liderId ? db.from('colaborador').select('nivel').eq('id', liderId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  for (const r of [empresa, registros, combinados, alcadas, lider]) if (r.error) throw new Error(`ler contexto: ${r.error.message}`)

  const trechos = await trechosDaPessoa(db, colaboradorId, relato)
  const ctxPessoa = (p.contexto_colaborador?.dados ?? null) as ContextoColaborador | null
  const ctxEmpresa = (empresa.data?.dados ?? null) as ContextoEmpresa | null
  return {
    pessoa: { id: p.id, nome: p.nome, cargo: p.cargo, area: p.area, empresa_id: p.empresa_id },
    itens: [
      ...(liderId ? itensDasAlcadas(alcadas.data ?? [], lider.data?.nivel ?? null) : []),
      ...itensDaEmpresa(ctxEmpresa),
      ...itensDaPessoa(p, ctxPessoa),
      ...itensDoHistorico(registros.data ?? [], combinados.data ?? []),
      ...itensDeReunioes(trechos),
    ],
  }
}

/** Camada 7 (docs/03 §3): busca textual com o relato + recência, só em documentos confirmados para a pessoa. */
async function trechosDaPessoa(db: Db, colaboradorId: string, relato: string | null): Promise<TrechoBasico[]> {
  const vinc = await db.from('documento_colaborador').select('documento_id').eq('colaborador_id', colaboradorId).eq('confirmado', true)
  const docs = (vinc.data ?? []).map((v) => v.documento_id)
  if (docs.length === 0) return []
  const campos = 'id, texto, locutor, documento:documento_id(titulo, tipo, data_evento)'
  const termos = relato ? termosDeBusca(relato) : null
  if (termos) {
    const achados = await db.from('trecho').select(campos).in('documento_id', docs).textSearch('busca', termos, { config: 'portuguese', type: 'websearch' }).limit(6)
    if (!achados.error && achados.data?.length) return achados.data as TrechoBasico[]
  }
  const recentes = await db.from('trecho').select(campos).in('documento_id', docs).order('documento_id', { ascending: false }).order('ordem').limit(4)
  return (recentes.data ?? []) as TrechoBasico[]
}

/** Contexto de uma decisão do líder: alçadas do nível dele, organização e, se houver, a pessoa afetada. */
export async function carregarContextoDaDecisao(db: Db, empresaId: string, liderId: string, colaboradorId: string | null): Promise<ItemDeContexto[]> {
  if (colaboradorId) {
    const ctx = await carregarContextoDaPessoa(db, colaboradorId, liderId, null)
    if (ctx) return ctx.itens
  }
  const [empresa, alcadas, lider] = await Promise.all([
    db.from('contexto_empresa').select('dados').eq('empresa_id', empresaId).maybeSingle(),
    db.from('alcada').select('id, nivel, cargo_referencia, pode_decidir, limites, consultar').eq('empresa_id', empresaId).eq('ativo', true),
    db.from('colaborador').select('nivel').eq('id', liderId).maybeSingle(),
  ])
  for (const r of [empresa, alcadas, lider]) if (r.error) throw new Error(`ler contexto: ${r.error.message}`)
  return [...itensDasAlcadas(alcadas.data ?? [], lider.data?.nivel ?? null), ...itensDaEmpresa((empresa.data?.dados ?? null) as ContextoEmpresa | null)]
}
