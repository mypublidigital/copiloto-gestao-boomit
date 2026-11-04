import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Database } from '@/tipos/banco'

export type Papel = Database['public']['Enums']['papel_usuario']

export interface Vinculo {
  empresa_id: string
  papel: Papel
  colaborador_id: string | null
}

export interface EstadoSessao {
  carregando: boolean
  sessao: Session | null
  /** Papel principal na empresa atual (admin > líder > mentor). */
  vinculo: Vinculo | null
  nome: string
  sair: () => Promise<void>
}

export const SessaoContexto = createContext<EstadoSessao | null>(null)

export function useSessao(): EstadoSessao {
  const s = useContext(SessaoContexto)
  if (!s) throw new Error('useSessao fora do SessaoProvider')
  return s
}

const PRIORIDADE: Papel[] = ['admin_boomit', 'admin_empresa', 'lider', 'mentor']

export function escolherVinculo(vinculos: Vinculo[]): Vinculo | null {
  return [...vinculos].sort((a, b) => PRIORIDADE.indexOf(a.papel) - PRIORIDADE.indexOf(b.papel))[0] ?? null
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  lider: 'Líder',
  mentor: 'Mentor Boomit',
  admin_empresa: 'Admin da empresa',
  admin_boomit: 'Admin Boomit',
}
