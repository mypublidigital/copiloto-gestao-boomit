// Edge Function conector-boomit: sincroniza os dados da Boomit para o Copiloto.
// Roda com service role (CLAUDE.md, "Regras de dados"). Quem pode chamar:
//   - o próprio service role (jobs e seed);
//   - um usuário logado que seja admin da empresa (botão "sincronizar agora", Sprint 1).
// A fonte vem de BOOMIT_FONTE (mock | api).
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../_shared/tipos/banco.ts'
import { criarFonte } from '../_shared/adaptadores/boomit/fonte.ts'
import { sincronizar } from '../_shared/adaptadores/boomit/sincronizar.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

function papelDoToken(token: string): string | null {
  try {
    const parte = token.split('.')[1] ?? ''
    const json = atob(parte.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: string }).role ?? null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'Use POST' })

  const url = Deno.env.get('SUPABASE_URL')
  const chaveServico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !chaveServico) return responder(500, { erro: 'Ambiente sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY' })
  const db = createClient<Database>(url, chaveServico, { auth: { persistSession: false } })

  // O gateway já verificou a assinatura do JWT (verify_jwt). Aqui só decidimos a permissão.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (papelDoToken(token) !== 'service_role') {
    const { data: usuario } = await db.auth.getUser(token)
    if (!usuario.user) return responder(401, { erro: 'Sessão inválida' })
    const { data: admin } = await db
      .from('membro')
      .select('empresa_id')
      .eq('user_id', usuario.user.id)
      .in('papel', ['admin_empresa', 'admin_boomit'])
      .limit(1)
    if (!admin?.length) return responder(403, { erro: 'Só o admin da empresa pode sincronizar' })
  }

  try {
    const resumo = await sincronizar(db, criarFonte(Deno.env.get('BOOMIT_FONTE')))
    return responder(resumo.status === 'erro' ? 500 : 200, resumo)
  } catch (erro) {
    return responder(500, { erro: erro instanceof Error ? erro.message : String(erro) })
  }
})
