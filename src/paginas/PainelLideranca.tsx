// M8 · Painel da gestão superior: andamento por líder, só contagens e prazos (função
// andamento_lideranca no banco). Nenhum conteúdo de ensaio, preparação ou simulação.
import { Cartao, Estado } from '@/components/Estado'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'

export function PainelLideranca({ empresaId, vazio = null }: { empresaId: string; vazio?: string | null }) {
  const consulta = useConsulta(async () => exigir(await supabase.rpc('andamento_lideranca', { p_empresa: empresaId })), [empresaId])
  return (
    <Estado consulta={consulta}>
      {(linhas) =>
        linhas.length === 0 ? (
          vazio ? <p className="text-sm text-muted-foreground">{vazio}</p> : null
        ) : (
          <Cartao titulo="Andamento da liderança">
            <p className="mb-3 text-xs text-muted-foreground">Só contagens e prazos. Ensaios e preparações são privados de cada líder.</p>
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
                  {linhas.map((l) => (
                    <tr key={l.lider_id}>
                      <td className="py-2 pr-3 font-medium">{l.lider_nome}</td>
                      <td className="py-2 pr-3">{l.situacoes_preparadas}</td>
                      <td className="py-2 pr-3">{l.situacoes_aplicadas}</td>
                      <td className="py-2 pr-3">{l.situacoes_encaminhadas}</td>
                      <td className="py-2 pr-3">{l.combinados_abertos}</td>
                      <td className={`py-2 pr-3 ${l.combinados_vencidos > 0 ? 'font-semibold text-destructive' : ''}`}>{l.combinados_vencidos}</td>
                      <td className="py-2 pr-3">{l.combinados_cumpridos}</td>
                      <td className="py-2">{l.combinados_no_prazo_pct != null ? `${l.combinados_no_prazo_pct}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Cartao>
        )
      }
    </Estado>
  )
}
