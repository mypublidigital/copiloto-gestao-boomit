// Régua de comunicação (inclusão de 08/11/2026): insights da semana com as recomendações dos
// agentes, próximos lembretes e a caixa de saída de e-mails (o que foi e o que vai ser enviado).
import { useState } from 'react'
import { Link } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { ETAPAS } from '@/dominio/agenda'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { chamarFuncao } from '@/servicos/funcoes'
import { InsightsDaSemana } from './comunicacao/InsightsDaSemana'

const STATUS_EMAIL: Record<string, { rotulo: string; cor: string }> = {
  enviado: { rotulo: 'Enviado', cor: 'bg-boomit-verde text-white' },
  pendente: { rotulo: 'Na fila', cor: 'bg-secondary' },
  erro: { rotulo: 'Erro no envio', cor: 'bg-destructive text-white' },
  aguardando_provedor: { rotulo: 'Aguardando provedor', cor: 'bg-amber-100 text-amber-900' },
  bloqueado_demo: { rotulo: 'Não enviado (demonstração)', cor: 'bg-secondary' },
  descartado: { rotulo: 'Descartado', cor: 'bg-secondary' },
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function Comunicacao() {
  const { vinculo } = useSessao()
  const [recarga, setRecarga] = useState(0)
  const [aberto, setAberto] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const emails = useConsulta(async () => exigir(await supabase.from('email_envio').select('id, tipo, etapa, assunto, para, status, erro, criado_em, enviado_em, html').order('criado_em', { ascending: false }).limit(50)), [recarga])
  const proximos = useConsulta(
    async () =>
      exigir(
        await supabase
          .from('lembrete')
          .select('id, canal, etapa, enviar_em, combinado:combinado_id(descricao), compromisso:compromisso_id(titulo), decisao:decisao_id(titulo)')
          .is('enviado_em', null)
          .order('enviar_em')
          .limit(20),
      ),
    [recarga],
  )

  async function gerar(enviarEmail: boolean) {
    setGerando(true)
    setErro(null)
    try {
      await chamarFuncao('insights-semanais', { enviar_email: enviarEmail })
      setRecarga((n) => n + 1)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setGerando(false)
    }
  }

  if (vinculo?.papel !== 'lider') return <p className="text-muted-foreground">A régua de comunicação é da liderança: entre como líder.</p>

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Régua de comunicação</p>
        <h1 className="text-2xl font-semibold">Lembretes, e-mails e insights</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Cada compromisso, combinado e decisão com data gera lembretes automáticos, no app e por e-mail. Toda segunda-feira, às 7h, os agentes leem a sua semana e mandam os insights com recomendações.
        </p>
      </header>

      <InsightsDaSemana recarga={recarga} acoes={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={gerando} onClick={() => gerar(false)}>{gerando ? 'Lendo a semana…' : 'Gerar agora'}</Button>
          <Button size="sm" variant="outline" disabled={gerando} onClick={() => gerar(true)}>Gerar e enviar por e-mail</Button>
        </div>
      } />
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Próximos lembretes">
          <Estado consulta={proximos}>
            {(lista) =>
              lista.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lembrete agendado. Agende um compromisso na <Link to="/agenda" className="underline">agenda</Link>.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {lista.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3">
                      <span>
                        <span className="font-medium">{l.compromisso?.titulo ?? l.combinado?.descricao ?? l.decisao?.titulo ?? '—'}</span>
                        <span className="block text-xs text-muted-foreground">{ETAPAS[l.etapa] ?? l.etapa} · {l.canal === 'email' ? 'e-mail' : 'no app'}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{dataHora(l.enviar_em)}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </Estado>
        </Cartao>
        <Cartao titulo="Como funciona a régua">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground"><tr><th className="pb-1">Evento</th><th className="pb-1">Quando</th><th className="pb-1">Canal</th></tr></thead>
            <tbody className="[&_td]:py-1 [&_td]:align-top">
              <tr><td>Compromisso agendado</td><td>Na hora (confirmação), véspera, 1 hora antes, 2 horas depois (registre como foi)</td><td>E-mail e app</td></tr>
              <tr><td>Combinado com prazo</td><td>2 dias antes, no dia e no dia seguinte se vencer (9h)</td><td>E-mail e app</td></tr>
              <tr><td>Decisão com prazo</td><td>Véspera do prazo e dia da revisão (9h)</td><td>E-mail e app</td></tr>
              <tr><td>Insights da semana</td><td>Segundas, 7h</td><td>E-mail e esta página</td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Ao concluir, cancelar ou remarcar, os lembretes pendentes são refeitos sozinhos. Os e-mails não trazem o conteúdo das suas preparações: só título, data e o link.</p>
        </Cartao>
      </div>

      <Cartao titulo="Caixa de saída de e-mails">
        <Estado consulta={emails}>
          {(lista) =>
            lista.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum e-mail ainda. Eles aparecem aqui quando a régua dispara (a cada 15 minutos).</p>
            ) : (
              <ul className="divide-y text-sm">
                {lista.map((e) => {
                  const s = STATUS_EMAIL[e.status] ?? { rotulo: e.status, cor: 'bg-secondary' }
                  return (
                    <li key={e.id} className="py-2">
                      <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setAberto(aberto === e.id ? null : e.id)} aria-expanded={aberto === e.id}>
                        <span>
                          <span className="font-medium">{e.assunto}</span>
                          <span className="block text-xs text-muted-foreground">{e.tipo === 'insights_semanais' ? 'Insights semanais' : (ETAPAS[e.etapa ?? ''] ?? 'Lembrete')} · para {e.para} · {formatarData(e.criado_em)}</span>
                        </span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs', s.cor)} title={e.erro ?? undefined}>{s.rotulo}</span>
                      </button>
                      {aberto === e.id && (
                        <div className="mt-2">
                          {e.erro && <p className="mb-1 text-xs text-muted-foreground">{e.erro}</p>}
                          <iframe title={`Prévia: ${e.assunto}`} srcDoc={e.html} sandbox="" className="h-[28rem] w-full rounded border bg-white" />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )
          }
        </Estado>
      </Cartao>
    </div>
  )
}
