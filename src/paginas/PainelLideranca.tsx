// M8 · Painel da gestão superior: andamento por líder, só contagens e prazos (função
// andamento_lideranca no banco). Sprint 6: drill-down até o líder com prazos e status
// (andamento_combinados_lider). Nenhum conteúdo de ensaio, preparação ou simulação.
import { Fragment, useState } from 'react'
import { Cartao, Estado } from '@/components/Estado'
import { ROTULO_STATUS_COMBINADO } from '@/dominio/combinados'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'

export function PainelLideranca({ empresaId, vazio = null }: { empresaId: string; vazio?: string | null }) {
  const consulta = useConsulta(async () => exigir(await supabase.rpc('andamento_lideranca', { p_empresa: empresaId })), [empresaId])
  const [aberto, setAberto] = useState<string | null>(null)
  return (
    <Estado consulta={consulta}>
      {(linhas) =>
        linhas.length === 0 ? (
          vazio ? <p className="text-sm text-muted-foreground">{vazio}</p> : null
        ) : (
          <Cartao titulo="Andamento da liderança">
            <p className="mb-3 text-xs text-muted-foreground">
              Só contagens e prazos. Ensaios e preparações são privados de cada líder. Clique num líder para ver os prazos.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Líder</th>
                    <th className="py-2 pr-3 font-medium">Preparadas</th>
                    <th className="py-2 pr-3 font-medium">Aplicadas</th>
                    <th className="py-2 pr-3 font-medium">Encaminhadas</th>
                    <th className="py-2 pr-3 font-medium">Combinados abertos</th>
                    <th className="py-2 pr-3 font-medium">Vencidos</th>
                    <th className="py-2 pr-3 font-medium">Cumpridos</th>
                    <th className="py-2 font-medium">No prazo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {linhas.map((l) => {
                    const expandido = aberto === l.lider_id
                    return (
                      <Fragment key={l.lider_id}>
                        <tr className="cursor-pointer hover:bg-secondary/60" aria-expanded={expandido} onClick={() => setAberto(expandido ? null : l.lider_id)}>
                          <td className="py-2 pr-3 font-medium">
                            {expandido ? '▾' : '▸'} {l.lider_nome}
                          </td>
                          <td className="py-2 pr-3">{l.situacoes_preparadas}</td>
                          <td className="py-2 pr-3">{l.situacoes_aplicadas}</td>
                          <td className="py-2 pr-3">{l.situacoes_encaminhadas}</td>
                          <td className="py-2 pr-3">{l.combinados_abertos}</td>
                          <td className={`py-2 pr-3 ${l.combinados_vencidos > 0 ? 'font-semibold text-destructive' : ''}`}>{l.combinados_vencidos}</td>
                          <td className="py-2 pr-3">{l.combinados_cumpridos}</td>
                          <td className="py-2">{l.combinados_no_prazo_pct != null ? `${l.combinados_no_prazo_pct}%` : '—'}</td>
                        </tr>
                        {expandido && (
                          <tr>
                            <td colSpan={8} className="bg-secondary/40 px-3 py-2">
                              <PrazosDoLider liderId={l.lider_id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Cartao>
        )
      }
    </Estado>
  )
}

// Drill-down até o líder: pessoa, prazo e status de cada combinado. Sem descrição nem ensaios.
function PrazosDoLider({ liderId }: { liderId: string }) {
  const consulta = useConsulta(async () => exigir(await supabase.rpc('andamento_combinados_lider', { p_lider: liderId })), [liderId])
  return (
    <Estado consulta={consulta}>
      {(linhas) =>
        linhas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum combinado confirmado.</p>
        ) : (
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {linhas.map((c, i) => (
              <li key={i} className={c.vencido ? 'font-semibold text-destructive' : ''}>
                {c.colaborador_nome ?? 'Sem pessoa'} · prazo {formatarData(c.prazo)} · {c.vencido ? 'vencido' : ROTULO_STATUS_COMBINADO[c.status]}
              </li>
            ))}
          </ul>
        )
      }
    </Estado>
  )
}
