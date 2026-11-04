import { NavLink, Outlet } from 'react-router'
import { ROTULO_PAPEL, useSessao } from '@/auth/sessao'
import { Button } from '@/components/ui/button'
import { SECOES } from '@/config/navegacao'
import { PersonasCabecalho } from '@/demo'
import { cn } from '@/lib/utils'
import { FaixaDemo } from './FaixaDemo'
import { Notificacoes } from './Notificacoes'

export function Layout() {
  const { nome, vinculo, sessao, sair } = useSessao()
  return (
    <div className="min-h-svh">
      <FaixaDemo />
      <div className="flex">
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-boomit-preto px-3 py-6 text-boomit-claro md:flex">
          <div className="px-3 pb-6">
            <p className="text-xs uppercase tracking-widest text-boomit-taupe">Boomit</p>
            <p className="text-lg font-semibold">Copiloto de Gestão</p>
          </div>
          <nav aria-label="Seções" className="flex flex-col gap-1">
            {SECOES.map(({ caminho, titulo, icone: Icone }) => (
              <NavLink
                key={caminho}
                to={caminho}
                end={caminho === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-boomit-verde text-boomit-claro' : 'text-boomit-cinza-azulado hover:bg-white/10',
                  )
                }
              >
                <Icone className="size-4" aria-hidden />
                {titulo}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-3 md:px-10">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>
                <span className="font-semibold">{nome}</span>
                {vinculo && <span className="text-muted-foreground"> · {ROTULO_PAPEL[vinculo.papel]}</span>}
              </span>
              {vinculo?.papel === 'lider' && (
                <nav aria-label="Atalhos" className="flex gap-1">
                  {(
                    [
                      ['/preparar', 'Preparar'],
                      ['/registrar', 'Registrar'],
                      ['/combinados', 'Combinados'],
                      ['/fontes', 'Subir reunião'],
                    ] as const
                  ).map(([to, rotulo]) => (
                    <NavLink key={to} to={to} className={({ isActive }) => cn('rounded-md px-2.5 py-1 hover:bg-secondary', isActive && 'bg-secondary font-semibold')}>
                      {rotulo}
                    </NavLink>
                  ))}
                </nav>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PersonasCabecalho atual={sessao?.user.email ?? null} />
              <Notificacoes />
              <Button variant="outline" size="sm" onClick={sair}>
                Sair
              </Button>
            </div>
          </header>
          <main className="px-6 py-8 md:px-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
