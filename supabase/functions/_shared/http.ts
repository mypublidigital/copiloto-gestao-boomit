// Utilitários das Edge Functions do produto: CORS, respostas JSON e cliente com o JWT do usuário.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './tipos/banco.ts'
import type { Uso } from './motor/modelo.ts'
import { estimarCusto } from './motor/modelo.ts'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export class ErroHttp extends Error {
  readonly status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

export function exigirEnv(nome: string, env: (n: string) => string | undefined): string {
  const v = env(nome)
  if (!v) throw new ErroHttp(500, `Variável ${nome} não configurada na função`)
  return v
}

/** Cliente com o JWT de quem chamou: tudo o que ele ler passa pela RLS. */
export async function clienteDoUsuario(req: Request, env: (n: string) => string | undefined) {
  const autorizacao = req.headers.get('Authorization')
  if (!autorizacao) throw new ErroHttp(401, 'Sessão ausente')
  const db: SupabaseClient<Database> = createClient<Database>(exigirEnv('SUPABASE_URL', env), exigirEnv('SUPABASE_ANON_KEY', env), {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false },
  })
  const { data } = await db.auth.getUser(autorizacao.replace(/^Bearer\s+/i, ''))
  if (!data.user) throw new ErroHttp(401, 'Sessão inválida')
  return { db, usuario: data.user }
}

/** Registra uma chamada de IA: só metadados (modelo, tokens, custo, fontes), nunca o conteúdo. */
export async function registrarInteracao(
  db: SupabaseClient<Database>,
  r: { empresa_id: string; situacao_id: string | null; finalidade: string; versao_prompt: string; uso: Uso; fontes_ids: string[] },
): Promise<string | null> {
  const { data, error } = await db
    .from('interacao_ia')
    .insert({
      empresa_id: r.empresa_id,
      situacao_id: r.situacao_id,
      finalidade: r.finalidade,
      versao_prompt: r.versao_prompt,
      modelo: r.uso.modelo,
      fontes_ids: r.fontes_ids,
      tokens_entrada: r.uso.tokens_entrada + r.uso.cache_leitura + r.uso.cache_escrita,
      tokens_saida: r.uso.tokens_saida,
      custo_estimado: estimarCusto(r.uso),
      latencia_ms: r.uso.latencia_ms,
    })
    .select('id')
    .single()
  if (error) console.error('registrar interacao_ia:', error.message)
  return data?.id ?? null
}

/** Cliente de serviço (service_role): só para jobs, conector e processamento de documentos. */
export function clienteDeServico(env: (n: string) => string | undefined): SupabaseClient<Database> {
  return createClient<Database>(exigirEnv('SUPABASE_URL', env), exigirEnv('SUPABASE_SERVICE_ROLE_KEY', env), { auth: { persistSession: false } })
}

/** Confere que a chamada veio do agendador (pg_cron): segredo gravado em config_sistema. */
export async function ehAgendador(req: Request, servico: SupabaseClient<Database>): Promise<boolean> {
  const enviado = req.headers.get('x-agendador')
  if (!enviado) return false
  const { data } = await servico.from('config_sistema').select('valor').eq('chave', 'segredo_agendador').maybeSingle()
  return Boolean(data?.valor) && data!.valor === enviado
}

/** Endereço do app para os links dos e-mails (config_sistema.url_app). */
export async function urlDoApp(servico: SupabaseClient<Database>): Promise<string> {
  const { data } = await servico.from('config_sistema').select('valor').eq('chave', 'url_app').maybeSingle()
  return (data?.valor ?? '').replace(/\/$/, '')
}
