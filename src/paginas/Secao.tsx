// As seis frentes de gestão do menu (desempenho, desenvolvimento, comportamento, organização,
// crises e liderança). Visão do líder; os outros papéis veem um aviso com o caminho certo.
import { Link } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Estado } from '@/components/Estado'
import type { SecaoNavegacao } from '@/config/navegacao'
import { useConsulta } from '@/lib/useConsulta'
import { carregarFrentes } from './frentes/dados'
import { Comportamento, Crises, Desempenho, Desenvolvimento, Lideranca, Organizacao } from './frentes/Paineis'

const PAINEIS = {
  '/desempenho': Desempenho,
  '/desenvolvimento': Desenvolvimento,
  '/comportamento': Comportamento,
  '/organizacao': Organizacao,
  '/crises': Crises,
  '/lideranca': Lideranca,
} as const

export function Secao({ secao }: { secao: SecaoNavegacao }) {
  const { vinculo } = useSessao()
  const ehLider = vinculo?.papel === 'lider' && Boolean(vinculo.colaborador_id)
  const consulta = useConsulta(async () => (ehLider && vinculo ? { ...(await carregarFrentes(vinculo)), agora: Date.now() } : null), [vinculo?.colaborador_id, ehLider])
  const Painel = PAINEIS[secao.caminho as keyof typeof PAINEIS]

  if (!ehLider || !Painel) {
    return (
      <section className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{secao.titulo}</h1>
        <p className="mt-2 text-muted-foreground">{secao.descricao}</p>
        <p className="mt-6 rounded-lg border bg-card p-5 text-sm">
          As frentes de gestão são o espaço de trabalho do líder com a própria equipe.
          {vinculo?.papel === 'admin_empresa' || vinculo?.papel === 'admin_boomit'
            ? ' Como RH, você acompanha a adoção e os combinados de todas as lideranças na '
            : ' Como mentor, você acompanha o líder mentorado e a equipe dele na '}
          <Link to="/" className="underline">Visão geral</Link>.
        </p>
      </section>
    )
  }
  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <Estado consulta={consulta}>{(d) => (d ? <Painel d={d} agora={d.agora} /> : null)}</Estado>
    </div>
  )
}
