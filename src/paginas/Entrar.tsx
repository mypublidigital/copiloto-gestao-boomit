import { useState, type FormEvent } from 'react'
import { FaixaDemo } from '@/components/layout/FaixaDemo'
import { Button } from '@/components/ui/button'
import { PersonasEntrada } from '@/demo'
import { supabase } from '@/lib/supabase'

// Login por link mágico (usuários reais). No modo demonstração, também o seletor de persona.
export function Entrar() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'livre' | 'enviando' | 'enviado' | 'erro'>('livre')
  const [mensagem, setMensagem] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    })
    if (error) {
      setEstado('erro')
      setMensagem('Não foi possível enviar o link. Confira o e-mail ou fale com o RH.')
    } else {
      setEstado('enviado')
      setMensagem('Enviamos um link de acesso para o seu e-mail.')
    }
  }

  return (
    <div className="min-h-svh">
      <FaixaDemo />
      <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-16">
        <div>
          <p className="text-xs uppercase tracking-widest text-boomit-taupe">Boomit</p>
          <h1 className="text-2xl font-semibold">Copiloto de Gestão</h1>
        </div>

        <PersonasEntrada />

        <form onSubmit={enviar} className="flex flex-col gap-3 rounded-lg border bg-card p-5">
          <label htmlFor="email" className="font-semibold">
            Entrar com link no e-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border bg-background px-3 py-2"
            placeholder="voce@empresa.com"
          />
          <Button type="submit" disabled={estado === 'enviando'}>
            {estado === 'enviando' ? 'Enviando…' : 'Enviar link'}
          </Button>
          {mensagem && <p className={estado === 'erro' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{mensagem}</p>}
        </form>
      </main>
    </div>
  )
}
