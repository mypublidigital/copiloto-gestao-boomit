import { modoDemo } from '@/config/ambiente'

// Faixa fixa exigida em modo demonstração (CLAUDE.md, "Como trabalhar", item 5).
export function FaixaDemo() {
  if (!modoDemo) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-boomit-taupe px-4 py-1.5 text-center text-sm font-semibold text-boomit-claro"
    >
      Ambiente de demonstração · dados fictícios
    </div>
  )
}
