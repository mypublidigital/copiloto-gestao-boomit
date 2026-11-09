// Peças comuns das telas das frentes.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ROTULO_STATUS_SITUACAO } from '@/dominio/frentes'
import { formatarData } from '@/lib/datas'
import { cn } from '@/lib/utils'
import type { DadosFrentes } from './dados'

export function Atalhos({ itens }: { itens: { to: string; titulo: string; texto: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((a) => (
        <Link key={a.to + a.titulo} to={a.to} className="rounded-lg border bg-card p-4 transition-colors hover:border-primary">
          <p className="font-semibold">{a.titulo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{a.texto}</p>
        </Link>
      ))}
    </div>
  )
}

export function Barra({ valor, max = 100, cor = 'bg-boomit-verde' }: { valor: number | null; max?: number; cor?: string }) {
  if (valor === null) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded bg-secondary"><div className={cn('h-1.5 rounded', cor)} style={{ width: `${Math.min(100, (valor / max) * 100)}%` }} /></div>
      <span className="text-xs tabular-nums">{max === 100 ? `${Math.round(valor)}%` : valor}</span>
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

/** Situações (preparações) do líder nesta frente: só ele vê. */
export function ListaSituacoes({ situacoes, nomes }: { situacoes: DadosFrentes['situacoes']; nomes: Map<string, string> }) {
  if (!situacoes.length) return <Vazio>Nenhuma conversa preparada nesta frente ainda.</Vazio>
  return (
    <ul className="divide-y text-sm">
      {situacoes.slice(0, 8).map((s) => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>
            <Link to={`/situacoes/${s.id}`} className="font-medium hover:underline">{s.titulo}</Link>
            <span className="block text-xs text-muted-foreground">{s.colaborador_id ? nomes.get(s.colaborador_id) ?? 'Pessoa' : 'Grupo'} · {formatarData(s.aplicada_em ?? s.criado_em)}</span>
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{ROTULO_STATUS_SITUACAO[s.status] ?? s.status}</span>
        </li>
      ))}
    </ul>
  )
}

export function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">Frente de gestão</p>
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">{descricao}</p>
      {children}
    </header>
  )
}
