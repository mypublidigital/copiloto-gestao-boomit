// Agenda da liderança (inclusão de 08/11/2026): dia, semana e mês, com o que está agendado e o
// que foi realizado, busca e o agendamento de compromissos (que liga a régua de lembretes).
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado, Numero } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import {
  agruparPorDia, buscarEventos, diaSP, diasDaVisao, type EventoAgenda, horaSP, limitesDaVisao, moverReferencia, pedeRegistro,
  resumoDosEventos, ROTULO_ORIGEM, ROTULO_STATUS, ROTULO_TIPO_COMPROMISSO, type StatusEvento, tituloDaVisao, type Visao,
} from '@/dominio/agenda'
import { hojeSaoPaulo, somarDias } from '@/dominio/combinados'
import { supabase } from '@/lib/supabase'
import { useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { carregarEquipe, carregarEventos } from './agenda/carregar'
import { DetalheCompromisso, NovoCompromisso } from './agenda/Compromisso'

const COR_STATUS: Record<StatusEvento, string> = {
  agendado: 'border-l-boomit-verde',
  realizado: 'border-l-boomit-taupe opacity-80',
  cancelado: 'border-l-muted line-through opacity-60',
  vencido: 'border-l-destructive',
}

const SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function rotuloDoEvento(e: EventoAgenda) {
  if (e.origem === 'compromisso') return ROTULO_TIPO_COMPROMISSO[e.tipo ?? ''] ?? 'Compromisso'
  return ROTULO_ORIGEM[e.origem]
}

function ItemEvento({ e, compacto, aoAbrir }: { e: EventoAgenda; compacto?: boolean; aoAbrir: (e: EventoAgenda) => void }) {
  const hora = horaSP(e.inicio)
  const registrar = pedeRegistro(e)
  return (
    <button
      type="button"
      onClick={() => aoAbrir(e)}
      className={cn('w-full rounded border border-l-4 bg-card px-2 py-1 text-left text-xs hover:bg-secondary', COR_STATUS[e.status], registrar && 'border-l-amber-500')}
      title={`${rotuloDoEvento(e)} · ${ROTULO_STATUS[e.status]}${e.pessoa ? ` · ${e.pessoa}` : ''}`}
    >
      <span className="font-semibold">{hora ?? 'Dia todo'}</span> <span className={cn(compacto && 'line-clamp-1')}>{e.titulo}</span>
      {!compacto && (
        <span className="block text-muted-foreground">
          {rotuloDoEvento(e)} · {registrar ? 'registre como foi' : ROTULO_STATUS[e.status].toLowerCase()}
          {e.pessoa ? ` · ${e.pessoa}` : ''}
        </span>
      )}
    </button>
  )
}

export function Agenda() {
  const { vinculo } = useSessao()
  const [params, setParams] = useSearchParams()
  const hoje = hojeSaoPaulo()
  const [visao, setVisao] = useState<Visao>('semana')
  const [referencia, setReferencia] = useState(hoje)
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const selecionado = params.get('compromisso')
  const [eventoAberto, setEventoAberto] = useState<EventoAgenda | null>(null)

  // Link de e-mail (?compromisso=…): leva a agenda para o dia do compromisso.
  const [ajustado, setAjustado] = useState<string | null>(null)
  if (selecionado && ajustado !== selecionado) {
    setAjustado(selecionado)
    void supabase.from('compromisso').select('inicio').eq('id', selecionado).maybeSingle().then(({ data }) => {
      if (data) setReferencia(diaSP(data.inicio))
    })
  }

  const buscando = busca.trim().length > 0
  const periodo = buscando
    ? { de: `${somarDias(hoje, -365)}T00:00:00-03:00`, ate: `${somarDias(hoje, 366)}T00:00:00-03:00`, deDia: somarDias(hoje, -365), ateDia: somarDias(hoje, 365) }
    : limitesDaVisao(visao, referencia)
  const equipe = useConsulta(() => (vinculo ? carregarEquipe(vinculo) : Promise.resolve([])), [vinculo?.colaborador_id])
  const consulta = useConsulta(() => (vinculo ? carregarEventos(vinculo, periodo) : Promise.resolve([])), [vinculo?.colaborador_id, periodo.de, periodo.ate, recarga])

  if (vinculo?.papel !== 'lider') return <p className="text-muted-foreground">A agenda é da liderança: entre como líder para ver a sua.</p>

  const abrir = (e: EventoAgenda) => {
    if (e.origem === 'compromisso') {
      setEventoAberto(null)
      setParams({ compromisso: e.id })
    } else setEventoAberto(e)
  }
  const fecharDetalhe = () => {
    setParams({})
    setEventoAberto(null)
  }

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Rotina de gestão</p>
          <h1 className="text-2xl font-semibold">Agenda da liderança</h1>
        </div>
        <Button onClick={() => setNovo((v) => !v)}>{novo ? 'Fechar' : 'Agendar compromisso'}</Button>
      </header>

      {novo && (
        <Cartao titulo="Novo compromisso">
          <Estado consulta={equipe}>
            {(pessoas) => (
              <NovoCompromisso
                vinculo={vinculo}
                equipe={pessoas}
                diaInicial={referencia < hoje ? hoje : referencia}
                aoFechar={() => setNovo(false)}
                aoSalvar={(id) => {
                  setNovo(false)
                  setRecarga((n) => n + 1)
                  setParams({ compromisso: id })
                }}
              />
            )}
          </Estado>
        </Cartao>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Visão" className="flex rounded-md border p-0.5">
            {(['dia', 'semana', 'mes'] as const).map((v) => (
              <button key={v} role="tab" aria-selected={visao === v} type="button" onClick={() => setVisao(v)} className={cn('rounded px-3 py-1 text-sm', visao === v && 'bg-boomit-verde text-white')}>
                {v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
          {!buscando && (
            <>
              <Button size="sm" variant="outline" aria-label="Anterior" onClick={() => setReferencia(moverReferencia(visao, referencia, -1))}><ChevronLeft className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => setReferencia(hoje)}>Hoje</Button>
              <Button size="sm" variant="outline" aria-label="Próximo" onClick={() => setReferencia(moverReferencia(visao, referencia, 1))}><ChevronRight className="size-4" /></Button>
              <p className="text-sm font-semibold capitalize">{tituloDaVisao(visao, referencia)}</p>
            </>
          )}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar na agenda</span>
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pessoa, tipo, assunto…" className="w-full rounded-md border bg-background py-2 pr-3 pl-8 text-sm" />
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Estado consulta={consulta}>
          {(todos) => {
            const eventos = buscarEventos(todos, busca)
            const resumo = resumoDosEventos(eventos)
            const paraRegistrar = eventos.filter((e) => pedeRegistro(e)).length
            return (
              <div className="flex min-w-0 flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Numero rotulo="Agendados" valor={resumo.agendado - paraRegistrar} />
                  <Numero rotulo="Realizados" valor={resumo.realizado} />
                  <Numero rotulo="Para registrar" valor={paraRegistrar} detalhe="Já passaram" />
                  <Numero rotulo="Vencidos" valor={resumo.vencido} />
                </div>
                {buscando ? (
                  <ResultadosBusca eventos={eventos} busca={busca} aoAbrir={abrir} />
                ) : visao === 'mes' ? (
                  <GradeMes dias={diasDaVisao('mes', referencia)} mes={referencia.slice(0, 7)} hoje={hoje} eventos={eventos} aoAbrir={abrir} aoDia={(d) => { setReferencia(d); setVisao('dia') }} />
                ) : visao === 'semana' ? (
                  <GradeSemana dias={diasDaVisao('semana', referencia)} hoje={hoje} eventos={eventos} aoAbrir={abrir} />
                ) : (
                  <ListaDia eventos={eventos} aoAbrir={abrir} />
                )}
              </div>
            )
          }}
        </Estado>

        <aside className="flex flex-col gap-3">
          {selecionado ? (
            <Cartao titulo="Compromisso">
              <DetalheCompromisso id={selecionado} aoFechar={fecharDetalhe} aoMudar={() => setRecarga((n) => n + 1)} />
            </Cartao>
          ) : eventoAberto ? (
            <Cartao titulo={ROTULO_ORIGEM[eventoAberto.origem]}>
              <div className="flex flex-col gap-2 text-sm">
                <p className="font-semibold">{eventoAberto.titulo}</p>
                <p className="text-muted-foreground">{ROTULO_STATUS[eventoAberto.status]}{eventoAberto.pessoa ? ` · ${eventoAberto.pessoa}` : ''}</p>
                {eventoAberto.detalhe && <p>{eventoAberto.detalhe}</p>}
                <div className="flex gap-3">
                  <Link to={eventoAberto.link} className="underline">Abrir</Link>
                  <button type="button" className="underline" onClick={fecharDetalhe}>Fechar</button>
                </div>
              </div>
            </Cartao>
          ) : (
            <Cartao titulo="Legenda">
              <ul className="space-y-1 text-xs">
                <li><span className="mr-2 inline-block h-3 w-1 bg-boomit-verde align-middle" />Agendado</li>
                <li><span className="mr-2 inline-block h-3 w-1 bg-amber-500 align-middle" />Já passou: registre como foi</li>
                <li><span className="mr-2 inline-block h-3 w-1 bg-boomit-taupe align-middle" />Realizado</li>
                <li><span className="mr-2 inline-block h-3 w-1 bg-destructive align-middle" />Prazo vencido</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">A agenda junta seus compromissos, os prazos de combinados e decisões, as conversas aplicadas e as reuniões enviadas. Só você vê.</p>
            </Cartao>
          )}
        </aside>
      </div>
    </div>
  )
}

function ListaDia({ eventos, aoAbrir }: { eventos: EventoAgenda[]; aoAbrir: (e: EventoAgenda) => void }) {
  if (!eventos.length) return <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Nada neste dia.</p>
  return (
    <ul className="flex flex-col gap-2">
      {[...agruparPorDia(eventos).values()].flat().map((e) => (
        <li key={`${e.origem}:${e.id}`}><ItemEvento e={e} aoAbrir={aoAbrir} /></li>
      ))}
    </ul>
  )
}

function GradeSemana({ dias, hoje, eventos, aoAbrir }: { dias: string[]; hoje: string; eventos: EventoAgenda[]; aoAbrir: (e: EventoAgenda) => void }) {
  const porDia = agruparPorDia(eventos)
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {dias.map((d, i) => (
        <section key={d} className={cn('min-h-28 rounded-lg border bg-card p-2', d === hoje && 'ring-2 ring-boomit-verde')}>
          <h3 className="mb-1 text-xs font-semibold text-muted-foreground">{SEMANA[i]} {d.slice(8, 10)}/{d.slice(5, 7)}</h3>
          <div className="flex flex-col gap-1">
            {(porDia.get(d) ?? []).map((e) => (
              <ItemEvento key={`${e.origem}:${e.id}`} e={e} compacto aoAbrir={aoAbrir} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function GradeMes({ dias, mes, hoje, eventos, aoAbrir, aoDia }: { dias: string[]; mes: string; hoje: string; eventos: EventoAgenda[]; aoAbrir: (e: EventoAgenda) => void; aoDia: (d: string) => void }) {
  const porDia = agruparPorDia(eventos)
  return (
    <div>
      <div className="hidden grid-cols-7 gap-1 pb-1 text-center text-xs font-semibold text-muted-foreground md:grid">
        {SEMANA.map((s) => <span key={s}>{s}</span>)}
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-7">
        {dias.map((d) => {
          const lista = porDia.get(d) ?? []
          return (
            <section key={d} className={cn('min-h-24 rounded border bg-card p-1', !d.startsWith(mes) && 'opacity-50', d === hoje && 'ring-2 ring-boomit-verde')}>
              <button type="button" onClick={() => aoDia(d)} className="mb-1 text-xs font-semibold hover:underline">{d.slice(8, 10)}</button>
              <div className="flex flex-col gap-0.5">
                {lista.slice(0, 3).map((e) => <ItemEvento key={`${e.origem}:${e.id}`} e={e} compacto aoAbrir={aoAbrir} />)}
                {lista.length > 3 && <button type="button" onClick={() => aoDia(d)} className="text-left text-xs text-muted-foreground underline">+{lista.length - 3}</button>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function ResultadosBusca({ eventos, busca, aoAbrir }: { eventos: EventoAgenda[]; busca: string; aoAbrir: (e: EventoAgenda) => void }) {
  if (!eventos.length) return <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Nada encontrado para “{busca}” nos últimos 12 meses e nos próximos 12.</p>
  const grupos = agruparPorDia(eventos)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{eventos.length} resultado(s), de 12 meses atrás a 12 meses à frente.</p>
      {[...grupos].map(([dia, lista]) => (
        <section key={dia}>
          <h3 className="mb-1 text-xs font-semibold text-muted-foreground">{dia.split('-').reverse().join('/')}</h3>
          <div className="flex flex-col gap-1">{lista.map((e) => <ItemEvento key={`${e.origem}:${e.id}`} e={e} aoAbrir={aoAbrir} />)}</div>
        </section>
      ))}
    </div>
  )
}
