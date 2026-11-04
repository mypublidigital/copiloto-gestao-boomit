// Carrega o contexto de uma pessoa para o motor, com o cliente do USUÁRIO (JWT):
// a RLS decide o que entra no prompt (CLAUDE.md, "Regras de dados").
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemDeContexto } from '../../motor/contexto.ts'
import type { Database } from '../../tipos/banco.ts'
import { itensDaEmpresa, itensDaPessoa, itensDasAlcadas, itensDoHistorico } from './itens.ts'
import type { ContextoColaborador, ContextoEmpresa } from './normalizador.ts'

type Db = SupabaseClient<Database>

export interface ContextoDaPessoa {
  pessoa: { id: string; nome: string; cargo: string | null; area: string | null; empresa_id: string }
  itens: ItemDeContexto[]
}

/** null quando a pessoa não está na visão do usuário. Com liderId, inclui as alçadas do nível do líder. */
export async function carregarContextoDaPessoa(db: Db, colaboradorId: string, liderId: string | null = null): Promise<ContextoDaPessoa | null> {
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

  const ctxPessoa = (p.contexto_colaborador?.dados ?? null) as ContextoColaborador | null
  const ctxEmpresa = (empresa.data?.dados ?? null) as ContextoEmpresa | null
  return {
    pessoa: { id: p.id, nome: p.nome, cargo: p.cargo, area: p.area, empresa_id: p.empresa_id },
    itens: [
      ...(liderId ? itensDasAlcadas(alcadas.data ?? [], lider.data?.nivel ?? null) : []),
      ...itensDaEmpresa(ctxEmpresa),
      ...itensDaPessoa(p, ctxPessoa),
      ...itensDoHistorico(registros.data ?? [], combinados.data ?? []),
    ],
  }
}
