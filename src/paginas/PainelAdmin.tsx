// Home do Admin da empresa: todos os colaboradores e o status do conector Boomit.
// Não mostra preparações nem simulações (a RLS também não deixaria).
import { Link } from 'react-router'
import type { Vinculo } from '@/auth/sessao'
import { Cartao, Estado, Numero } from '@/components/Estado'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { PainelLideranca } from './PainelLideranca'

const ROTULO_STATUS: Record<string, string> = { sucesso: 'Sucesso', parcial: 'Parcial', erro: 'Erro', em_andamento: 'Em andamento' }

async function carregar(empresaId: string) {
  const [colaboradores, execucao, vinculos] = await Promise.all([
    supabase.from('colaborador').select('id, nome, cargo, area, nivel, ativo').eq('empresa_id', empresaId).order('nome'),
    supabase.from('conector_execucao').select('*').eq('empresa_id', empresaId).order('iniciado_em', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vinculo_lideranca').select('lider_id, liderado_id').eq('empresa_id', empresaId).is('fim', null),
  ])
  const lista = exigir(colaboradores)
  if (execucao.error) throw new Error(execucao.error.message)
  const nomePorId = new Map(lista.map((c) => [c.id, c.nome]))
  const liderDe = new Map(exigir(vinculos).map((v) => [v.liderado_id, nomePorId.get(v.lider_id) ?? '—']))
  const alertas = Array.isArray(execucao.data?.alertas) ? (execucao.data.alertas as { alerta?: string }[]).map((a) => a.alerta ?? '') : []
  return { lista, execucao: execucao.data, liderDe, alertas: [...new Set(alertas)] }
}

export function PainelAdmin({ vinculo }: { vinculo: Vinculo }) {
  const consulta = useConsulta(() => carregar(vinculo.empresa_id), [vinculo.empresa_id])
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Administração da empresa</p>
        <h1 className="text-2xl font-semibold">Pessoas e conector Boomit</h1>
      </header>
      <Estado consulta={consulta}>
        {({ lista, execucao, liderDe, alertas }) => (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Numero rotulo="Colaboradores ativos" valor={lista.filter((c) => c.ativo).length} />
              <Numero
                rotulo="Última sincronização"
                valor={execucao ? ROTULO_STATUS[execucao.status] ?? execucao.status : 'Nunca'}
                detalhe={execucao ? `${formatarData(execucao.finalizado_em ?? execucao.iniciado_em)} · fonte ${execucao.fonte}` : undefined}
              />
              <Numero rotulo="Registros lidos" valor={execucao?.registros_lidos ?? 0} detalhe={`${alertas.length} alerta(s) de qualidade`} />
            </div>

            {alertas.length > 0 && (
              <Cartao titulo="Alertas de qualidade do conector">
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {alertas.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Cartao>
            )}

            <PainelLideranca empresaId={vinculo.empresa_id} />

            <Cartao titulo={`Colaboradores · ${lista.length}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Nome</th>
                      <th className="py-2 pr-4 font-medium">Cargo</th>
                      <th className="py-2 pr-4 font-medium">Área</th>
                      <th className="py-2 pr-4 font-medium">Nível</th>
                      <th className="py-2 font-medium">Líder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lista.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 pr-4">
                          <Link to={`/pessoas/${c.id}`} className="font-medium hover:underline">
                            {c.nome}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{c.cargo ?? '—'}</td>
                        <td className="py-2 pr-4">{c.area ?? '—'}</td>
                        <td className="py-2 pr-4 capitalize">{c.nivel === 'tatico' ? 'tático' : c.nivel === 'estrategico' ? 'estratégico' : (c.nivel ?? '—')}</td>
                        <td className="py-2">{liderDe.get(c.id) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Cartao>
          </>
        )}
      </Estado>
    </div>
  )
}
