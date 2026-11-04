// M7 · Combinados: lista por prazo, com status e pessoa. Pendentes podem ser confirmados aqui.
// Sprint 6: ações (cumprido, renegociar, não cumprido, cancelar) com histórico; lembretes no topo.
import { useState } from 'react'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado, Numero } from '@/components/Estado'
import { estaVencido, type StatusCombinado } from '@/dominio/combinados'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { CAMPOS_COMBINADO, ListaCombinados } from './combinados/ListaCombinados'

export function Combinados() {
  const { vinculo } = useSessao()
  const [recarga, setRecarga] = useState(0)
  const consulta = useConsulta(async () => {
    if (!vinculo?.colaborador_id) return []
    const linhas = exigir(
      await supabase
        .from('combinado')
        .select(`${CAMPOS_COMBINADO}, colaborador:colaborador_id(nome)`)
        .eq('lider_id', vinculo.colaborador_id)
        .not('status', 'in', '(cancelado)')
        .order('prazo', { ascending: true, nullsFirst: false }),
    )
    return linhas.map(({ colaborador, ...c }) => ({ ...c, status: c.status as StatusCombinado, pessoa: colaborador?.nome ?? null }))
  }, [vinculo?.colaborador_id, recarga])

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Acompanhamento</p>
        <h1 className="text-2xl font-semibold">Combinados</h1>
      </header>
      <Estado consulta={consulta}>
        {(lista) => {
          const pendentes = lista.filter((c) => c.status === 'pendente_revisao')
          const abertos = lista.filter((c) => c.status === 'aberto' || c.status === 'renegociado')
          const outros = lista.filter((c) => !pendentes.includes(c) && !abertos.includes(c))
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Numero rotulo="Para revisar" valor={pendentes.length} />
                <Numero rotulo="Abertos" valor={abertos.length} />
                <Numero rotulo="Vencidos" valor={abertos.filter((c) => estaVencido(c)).length} />
              </div>
              {pendentes.length > 0 && (
                <Cartao titulo="Para revisar">
                  <p className="mb-2 text-xs text-muted-foreground">Só viram combinado depois que você confirma.</p>
                  <ListaCombinados lista={pendentes} aoMudar={() => setRecarga((n) => n + 1)} mostrarPessoa />
                </Cartao>
              )}
              <Cartao titulo="Abertos, por prazo">
                <ListaCombinados lista={abertos} aoMudar={() => setRecarga((n) => n + 1)} mostrarPessoa />
              </Cartao>
              {outros.length > 0 && (
                <Cartao titulo="Encerrados">
                  <ListaCombinados lista={outros} aoMudar={() => setRecarga((n) => n + 1)} mostrarPessoa />
                </Cartao>
              )}
            </>
          )
        }}
      </Estado>
    </div>
  )
}
