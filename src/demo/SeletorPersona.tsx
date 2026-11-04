// Seletor de persona: só existe no modo demonstração. O módulo @/demo inteiro é trocado
// por um vazio nos builds sem VITE_MODO_DEMO=true; este arquivo nem entra
// no pacote (conferido por scripts/verificar-build-producao.mjs).
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { PERSONAS } from './personas'

export default function SeletorPersona({ compacto = false, atual }: { compacto?: boolean; atual?: string | null }) {
  const [entrando, setEntrando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function entrarComo(email: string) {
    const senha = import.meta.env.VITE_DEMO_SENHA
    if (!senha) {
      setErro('Falta VITE_DEMO_SENHA no .env.local')
      return
    }
    setEntrando(email)
    setErro(null)
    await supabase.auth.signOut()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro(`Não foi possível entrar: ${error.message}`)
    setEntrando(null)
  }

  return (
    <div className={cn(compacto ? 'flex flex-wrap items-center gap-1.5' : 'grid gap-2 sm:grid-cols-2')}>
      {compacto && <span className="text-xs text-muted-foreground">Ver como:</span>}
      {PERSONAS.map((p) => (
        <button
          key={p.chave}
          type="button"
          disabled={entrando !== null}
          onClick={() => entrarComo(p.email)}
          aria-pressed={atual === p.email}
          aria-label={`Entrar como ${p.nome} (${p.descricao})`}
          className={cn(
            'rounded-md border text-left transition-colors disabled:opacity-60',
            compacto ? 'px-2 py-1 text-xs' : 'bg-card p-3 hover:border-primary',
            atual === p.email ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary',
          )}
        >
          <span className="font-semibold">{p.nome}</span>
          {!compacto && <span className="block text-sm text-muted-foreground">{p.descricao}</span>}
        </button>
      ))}
      {erro && <p className="text-sm text-destructive sm:col-span-2">{erro}</p>}
    </div>
  )
}
