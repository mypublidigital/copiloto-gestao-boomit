import { Link } from 'react-router'
import { modoDemo } from '@/config/ambiente'
import { pendenciasAbertas } from '@/config/versao'

// Faixa fixa no topo (CLAUDE.md, "Como trabalhar", item 5, e registro de 08/11/2026):
// - demonstração: versão de desenvolvimento, dados fictícios;
// - produção: enquanto houver pendência de implantação, avisa e leva à lista do que falta.
export function FaixaDemo() {
  const abertas = pendenciasAbertas().length
  if (modoDemo) {
    return (
      <div role="status" className="sticky top-0 z-50 bg-boomit-taupe px-4 py-1.5 text-center text-sm font-semibold text-boomit-claro">
        Versão de desenvolvimento para demonstração · dados fictícios ·{' '}
        <Link to="/sobre" className="underline">o que falta para produção</Link>
      </div>
    )
  }
  if (!abertas) return null
  return (
    <div role="status" className="sticky top-0 z-50 bg-amber-100 px-4 py-1.5 text-center text-sm font-semibold text-amber-900">
      Implantação em andamento: {abertas} pendência(s) para a operação completa ·{' '}
      <Link to="/sobre" className="underline">ver o que falta</Link>
    </div>
  )
}
