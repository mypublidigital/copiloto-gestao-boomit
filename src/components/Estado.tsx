import type { ReactNode } from 'react'
import type { Consulta } from '@/lib/useConsulta'

/** Renderiza carregando / erro / conteúdo de uma consulta. */
export function Estado<T>({ consulta, children }: { consulta: Consulta<T>; children: (dados: T) => ReactNode }) {
  if (consulta.estado === 'carregando') return <p className="text-sm text-muted-foreground">Carregando…</p>
  if (consulta.estado === 'erro')
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Não foi possível carregar: {consulta.mensagem}
      </p>
    )
  return <>{children(consulta.dados)}</>
}

export function Cartao({ titulo, children, className = '' }: { titulo: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border bg-card p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  )
}

export function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  )
}
