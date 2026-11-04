// M4 · Simular conversa: interlocutor simulado em três intensidades, resposta em streaming,
// debrief com os cinco critérios. Ensaio: não vira registro e não vai para a gestão superior.
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Cartao, Estado } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { type Debrief, ROTULO_CRITERIO } from '@/dominio/preparacao'
import { supabase } from '@/lib/supabase'
import { useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { chamarFuncao, chamarFuncaoStream } from '@/servicos/funcoes'

type Intensidade = 'receptiva' | 'moderada' | 'desafiadora'
interface Fala {
  quem: 'lider' | 'interlocutor'
  texto: string
}

const INTENSIDADES: { valor: Intensidade; rotulo: string; descricao: string }[] = [
  { valor: 'receptiva', rotulo: 'Receptiva', descricao: 'Aberta e colaborativa' },
  { valor: 'moderada', rotulo: 'Moderada', descricao: 'Pede exemplos, traz obstáculos' },
  { valor: 'desafiadora', rotulo: 'Desafiadora', descricao: 'Defensiva, contesta generalizações' },
]

const COR_AVALIACAO = { observado: 'bg-boomit-verde text-boomit-claro', parcial: 'bg-boomit-taupe text-boomit-claro', ausente: 'bg-boomit-neutro-quente text-boomit-preto' }

export function Simular() {
  const { id = '' } = useParams()
  const situacao = useConsulta(async () => {
    const r = await supabase.from('situacao').select('id, titulo, sensivel, colaborador:colaborador_id(nome)').eq('id', id).maybeSingle()
    if (r.error) throw new Error(r.error.message)
    return r.data
  }, [id])
  const [intensidade, setIntensidade] = useState<Intensidade>('moderada')
  const [falas, setFalas] = useState<Fala[]>([])
  const [rascunho, setRascunho] = useState('')
  const [emCurso, setEmCurso] = useState('')
  const [simulacaoId, setSimulacaoId] = useState<string | null>(null)
  const [estado, setEstado] = useState<'livre' | 'respondendo' | 'debrief'>('livre')
  const [debrief, setDebrief] = useState<Debrief | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const texto = rascunho.trim()
    if (!texto || estado !== 'livre') return
    const novas = [...falas, { quem: 'lider' as const, texto }]
    setFalas(novas)
    setRascunho('')
    setEmCurso('')
    setErro(null)
    setEstado('respondendo')
    let resposta = ''
    try {
      await chamarFuncaoStream('simular', { acao: 'responder', situacao_id: id, simulacao_id: simulacaoId, intensidade, falas: novas }, (ev) => {
        if (typeof ev.t === 'string') {
          resposta += ev.t
          setEmCurso(resposta)
        }
        if (typeof ev.simulacao_id === 'string') setSimulacaoId(ev.simulacao_id)
        if (typeof ev.erro === 'string') setErro(ev.erro)
      })
      if (resposta) setFalas((f) => [...f, { quem: 'interlocutor', texto: resposta }])
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setEmCurso('')
      setEstado('livre')
    }
  }

  async function verDebrief() {
    setErro(null)
    setEstado('debrief')
    try {
      const r = await chamarFuncao<{ debrief: Debrief }>('simular', { acao: 'debrief', situacao_id: id, simulacao_id: simulacaoId, intensidade, falas })
      setDebrief(r.debrief)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setEstado('livre')
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link to={`/situacoes/${id}`} className="text-sm text-muted-foreground hover:underline">
        ← Voltar ao plano
      </Link>
      <Estado consulta={situacao}>
        {(s) =>
          !s ? (
            <p className="text-muted-foreground">Situação não encontrada.</p>
          ) : s.sensivel ? (
            <p className="text-muted-foreground">Situações em modo encaminhamento não têm simulação.</p>
          ) : (
            <>
              <header>
                <p className="text-sm text-muted-foreground">Ensaio · {s.titulo}</p>
                <h1 className="text-2xl font-semibold">Simular a conversa com {s.colaborador?.nome.split(' ')[0] ?? 'a pessoa'}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Interlocutor simulado: reações plausíveis, não a pessoa real. O ensaio é só seu e não vai para a gestão superior.
                </p>
              </header>

              <Cartao titulo="Intensidade">
                <div className="flex flex-wrap gap-2">
                  {INTENSIDADES.map((i) => (
                    <button
                      key={i.valor}
                      type="button"
                      disabled={falas.length > 0}
                      onClick={() => setIntensidade(i.valor)}
                      aria-pressed={intensidade === i.valor}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-left text-sm disabled:cursor-not-allowed',
                        intensidade === i.valor ? 'border-primary bg-primary text-primary-foreground' : 'disabled:opacity-50',
                      )}
                    >
                      <span className="font-medium">{i.rotulo}</span>
                      <span className="block text-xs opacity-80">{i.descricao}</span>
                    </button>
                  ))}
                </div>
              </Cartao>

              <Cartao titulo="Conversa">
                <ol className="mb-4 flex flex-col gap-3" aria-live="polite">
                  {falas.length === 0 && <li className="text-sm text-muted-foreground">Comece com a abertura que você preparou.</li>}
                  {falas.map((f, i) => (
                    <BalaoFala key={i} fala={f} nome={s.colaborador?.nome.split(' ')[0] ?? 'Pessoa'} />
                  ))}
                  {emCurso && <BalaoFala fala={{ quem: 'interlocutor', texto: emCurso }} nome={s.colaborador?.nome.split(' ')[0] ?? 'Pessoa'} />}
                  {estado === 'respondendo' && !emCurso && <li className="text-sm text-muted-foreground">…</li>}
                </ol>
                <form onSubmit={enviar} className="flex gap-2">
                  <textarea
                    aria-label="Sua fala"
                    rows={2}
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        e.currentTarget.form?.requestSubmit()
                      }
                    }}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="O que você diria?"
                  />
                  <Button type="submit" disabled={estado !== 'livre' || !rascunho.trim()}>
                    Enviar
                  </Button>
                </form>
                <div className="mt-3">
                  <Button variant="outline" onClick={verDebrief} disabled={estado !== 'livre' || !simulacaoId}>
                    {estado === 'debrief' ? 'Gerando debrief…' : 'Encerrar e ver debrief'}
                  </Button>
                </div>
              </Cartao>

              {erro && (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {erro}
                </p>
              )}

              {debrief && (
                <Cartao titulo="Debrief do ensaio (sem nota)">
                  <ul className="space-y-3">
                    {Object.entries(ROTULO_CRITERIO).map(([chave, c]) => {
                      const r = debrief.criterios[chave]
                      if (!r) return null
                      return (
                        <li key={chave} className="rounded border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{c.titulo}</span>
                            <span className={cn('rounded px-2 py-0.5 text-xs', COR_AVALIACAO[r.avaliacao])}>{r.avaliacao}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.descricao}</p>
                          {r.trecho && <p className="mt-2 italic">“{r.trecho}”</p>}
                          <p className="mt-1">{r.sugestao}</p>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-4 text-sm">
                    <span className="font-semibold">Ponto forte:</span> {debrief.ponto_forte}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Para a conversa real:</span> {debrief.proximo_passo}
                  </p>
                </Cartao>
              )}
            </>
          )
        }
      </Estado>
    </div>
  )
}

function BalaoFala({ fala, nome }: { fala: Fala; nome: string }) {
  const lider = fala.quem === 'lider'
  return (
    <li className={cn('max-w-[85%] rounded-lg px-3 py-2 text-sm', lider ? 'self-end bg-boomit-verde text-boomit-claro' : 'self-start bg-secondary')}>
      <span className="block text-xs opacity-75">{lider ? 'Você' : `${nome} · simulação`}</span>
      {fala.texto}
    </li>
  )
}
