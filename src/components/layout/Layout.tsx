import { NavLink, Outlet } from 'react-router'
import { SECOES } from '@/config/navegacao'
import { cn } from '@/lib/utils'
import { FaixaDemo } from './FaixaDemo'

export function Layout() {
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
        <main className="min-w-0 flex-1 px-6 py-8 md:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
