import type { SecaoNavegacao } from '@/config/navegacao'

export function Secao({ secao }: { secao: SecaoNavegacao }) {
  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold">{secao.titulo}</h1>
      <p className="mt-2 text-muted-foreground">{secao.descricao}</p>
      <div className="mt-8 rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
        Em construção. Esta área entra nas próximas etapas da Sprint 0.
      </div>
    </section>
  )
}
