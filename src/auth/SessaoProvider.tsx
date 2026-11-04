import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { escolherVinculo, SessaoContexto, type EstadoSessao, type Vinculo } from './sessao'

interface Perfil {
  userId: string
  vinculo: Vinculo | null
  nome: string
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [sessaoLida, setSessaoLida] = useState(false)
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setSessaoLida(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova)
      setSessaoLida(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const usuario = sessao?.user ?? null
  useEffect(() => {
    if (!usuario) return
    let ativo = true
    ;(async () => {
      // A RLS de membro devolve só as linhas do próprio usuário.
      const { data } = await supabase.from('membro').select('empresa_id, papel, colaborador_id').eq('user_id', usuario.id)
      const vinculo = escolherVinculo(data ?? [])
      let nome = (usuario.user_metadata as { nome?: string } | undefined)?.nome ?? usuario.email ?? ''
      if (vinculo?.colaborador_id) {
        const { data: eu } = await supabase.from('colaborador').select('nome').eq('id', vinculo.colaborador_id).maybeSingle()
        if (eu?.nome) nome = eu.nome
      }
      if (ativo) setPerfil({ userId: usuario.id, vinculo, nome })
    })()
    return () => {
      ativo = false
    }
  }, [usuario])

  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // O perfil vale só para o usuário da sessão atual (troca de persona = outro usuário).
  const perfilAtual = usuario && perfil?.userId === usuario.id ? perfil : null
  const carregando = !sessaoLida || (usuario !== null && perfilAtual === null)

  const valor = useMemo<EstadoSessao>(
    () => ({ carregando, sessao, vinculo: perfilAtual?.vinculo ?? null, nome: perfilAtual?.nome ?? '', sair }),
    [carregando, sessao, perfilAtual, sair],
  )
  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>
}
