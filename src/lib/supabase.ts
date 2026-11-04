import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/tipos/banco'

// Cliente do navegador: usa só a URL e a chave pública (anon). Toda leitura passa pela RLS
// com o JWT do usuário logado. Nenhuma URL ou chave fixa no código (CLAUDE.md).
const url = import.meta.env.VITE_SUPABASE_URL
const chavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !chavePublica) {
  throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local (ver .env.example).')
}

export const supabase = createClient<Database>(url, chavePublica, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
