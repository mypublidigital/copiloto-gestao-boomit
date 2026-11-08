// Agendar e acompanhar um compromisso: formulário, ações (realizado, remarcar, cancelar) e a
// régua de lembretes que o banco gera sozinho para cada agendamento.
import { useState } from 'react'
import { Link } from 'react-router'
import type { Vinculo } from '@/auth/sessao'
import { Button } from '@/components/ui/button'
import { ETAPAS, ROTULO_TIPO_COMPROMISSO } from '@/dominio/agenda'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import type { Database } from '@/tipos/banco'

type TipoCompromisso = Database['public']['Enums']['tipo_compromisso']
const TIPOS = Object.keys(ROTULO_TIPO_COMPROMISSO) as TipoCompromisso[]
const campo = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal'

/** Data e hora locais (São Paulo) → ISO com fuso. */
const isoDe = (data: string, hora: string) => `${data}T${hora || '09:00'}:00-03:00`

export function NovoCompromisso({ vinculo, equipe, diaInicial, aoSalvar, aoFechar }: { vinculo: Vinculo; equipe: { id: string; nome: string }[]; diaInicial: string; aoSalvar: (id: string) => void; aoFechar: () => void }) {
  const [tipo, setTipo] = useState<TipoCompromisso>('um_a_um')
  const [pessoa, setPessoa] = useState('')
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(diaInicial)
  const [hora, setHora] = useState('10:00')
  const [duracao, setDuracao] = useState(30)
  const [local, setLocal] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const nomePessoa = equipe.find((p) => p.id === pessoa)?.nome
  const tituloPadrao = `${ROTULO_TIPO_COMPROMISSO[tipo]}${nomePessoa ? ` com ${nomePessoa}` : ''}`

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!vinculo.colaborador_id) return
    setSalvando(true)
    setErro(null)
    const id = crypto.randomUUID()
    const r = await supabase.from('compromisso').insert({
      id, empresa_id: vinculo.empresa_id, lider_id: vinculo.colaborador_id, colaborador_id: pessoa || null, tipo,
      titulo: titulo.trim() || tituloPadrao, inicio: isoDe(data, hora), duracao_min: duracao, local: local.trim() || null, observacao: observacao.trim() || null,
    })
    setSalvando(false)
    if (r.error) setErro(r.error.message)
    else aoSalvar(id)
  }

  return (
    <form onSubmit={salvar} className="grid gap-3 text-sm font-medium sm:grid-cols-2">
      <label>
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCompromisso)} className={campo}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{ROTULO_TIPO_COMPROMISSO[t]}</option>
          ))}
        </select>
      </label>
      <label>
        Pessoa <span className="font-normal text-muted-foreground">(opcional)</span>
        <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} className={campo}>
          <option value="">Sem pessoa (equipe ou outro)</option>
          {equipe.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        Título
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={tituloPadrao} className={campo} />
      </label>
      <div className="grid grid-cols-3 gap-2 sm:col-span-2">
        <label>
          Data
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className={campo} />
        </label>
        <label>
          Hora
          <input type="time" required value={hora} onChange={(e) => setHora(e.target.value)} className={campo} />
        </label>
        <label>
          Duração
          <select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className={campo}>
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Local ou link
        <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Sala 2, Meet…" className={campo} />
      </label>
      <label>
        Observação
        <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Pauta curta" className={campo} />
      </label>
      <p className="text-xs font-normal text-muted-foreground sm:col-span-2">
        Ao agendar, a régua de comunicação cria os lembretes: confirmação por e-mail, véspera, 1 hora antes e, depois, um pedido para registrar como foi.
      </p>
      {erro && <p role="alert" className="text-sm text-destructive sm:col-span-2">{erro}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={salvando}>{salvando ? 'Agendando…' : 'Agendar'}</Button>
        <Button type="button" variant="outline" onClick={aoFechar}>Cancelar</Button>
      </div>
    </form>
  )
}

type CompromissoDetalhe = Pick<Database['public']['Tables']['compromisso']['Row'], 'id' | 'tipo' | 'titulo' | 'inicio' | 'duracao_min' | 'local' | 'observacao' | 'relato' | 'status' | 'colaborador_id'> & { colaborador: { nome: string } | null }

const TIPO_PREPARACAO: Record<string, string> = { um_a_um: 'preparacao_reuniao', feedback: 'feedback', pdi: 'pdi', conversa: 'conversa_dificil', reuniao_equipe: 'preparacao_reuniao', mentoria: 'preparacao_reuniao' }

export function DetalheCompromisso({ id, aoMudar, aoFechar }: { id: string; aoMudar: () => void; aoFechar: () => void }) {
  const [recarga, setRecarga] = useState(0)
  const [modo, setModo] = useState<'ver' | 'realizado' | 'remarcar'>('ver')
  const [relato, setRelato] = useState('')
  const [novaData, setNovaData] = useState('')
  const [novaHora, setNovaHora] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const consulta = useConsulta(async () => {
    const c: CompromissoDetalhe | null = exigir(await supabase.from('compromisso').select('id, tipo, titulo, inicio, duracao_min, local, observacao, relato, status, colaborador_id, colaborador:colaborador_id(nome)').eq('id', id).maybeSingle())
    if (!c) throw new Error('Compromisso não encontrado')
    const lembretes = exigir(await supabase.from('lembrete').select('id, canal, etapa, enviar_em, enviado_em').eq('compromisso_id', id).order('enviar_em'))
    return { c, lembretes, agora: Date.now() }
  }, [id, recarga])

  async function atualizar(campos: Database['public']['Tables']['compromisso']['Update']) {
    setErro(null)
    const r = await supabase.from('compromisso').update(campos).eq('id', id)
    if (r.error) return setErro(r.error.message)
    setModo('ver')
    setRecarga((n) => n + 1)
    aoMudar()
  }

  if (consulta.estado !== 'pronto') return <p className="text-sm text-muted-foreground">{consulta.estado === 'erro' ? consulta.mensagem : 'Carregando…'}</p>
  const { c, lembretes, agora } = consulta.dados
  const inicio = new Date(c.inicio)
  const quando = inicio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const passou = inicio.getTime() < agora

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{ROTULO_TIPO_COMPROMISSO[c.tipo]} · {c.status === 'agendado' ? (passou ? 'aguardando registro' : 'agendado') : c.status}</p>
          <p className="text-base font-semibold">{c.titulo}</p>
          <p className="text-muted-foreground">{quando} · {c.duracao_min} min{c.local ? ` · ${c.local}` : ''}</p>
          {c.colaborador?.nome && <p>Com {c.colaborador.nome}</p>}
          {c.observacao && <p className="mt-1">{c.observacao}</p>}
          {c.relato && <p className="mt-1 rounded bg-secondary p-2">Como foi: {c.relato}</p>}
        </div>
        <button type="button" className="text-xs underline" onClick={aoFechar}>Fechar</button>
      </div>

      {c.status === 'agendado' && modo === 'ver' && (
        <div className="flex flex-wrap gap-2">
          {c.colaborador_id && TIPO_PREPARACAO[c.tipo] && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/preparar?pessoa=${c.colaborador_id}&tipo=${TIPO_PREPARACAO[c.tipo]}`}>Preparar a conversa</Link>
            </Button>
          )}
          <Button size="sm" onClick={() => setModo('realizado')}>Marcar como realizado</Button>
          <Button size="sm" variant="outline" onClick={() => { setNovaData(c.inicio.slice(0, 10)); setNovaHora(''); setModo('remarcar') }}>Remarcar</Button>
          <Button size="sm" variant="outline" onClick={() => atualizar({ status: 'cancelado' })}>Cancelar</Button>
        </div>
      )}
      {modo === 'realizado' && (
        <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void atualizar({ status: 'realizado', realizado_em: passou ? c.inicio : new Date().toISOString(), relato: relato.trim() || null }) }}>
          <label className="font-medium">
            Como foi? <span className="font-normal text-muted-foreground">(relato curto, só você vê)</span>
            <textarea rows={3} value={relato} onChange={(e) => setRelato(e.target.value)} className={campo} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Registrar</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setModo('ver')}>Voltar</Button>
            {c.colaborador_id && <Link className="self-center text-xs underline" to={`/registrar?pessoa=${c.colaborador_id}`}>Registrar feedback ou combinado</Link>}
          </div>
        </form>
      )}
      {modo === 'remarcar' && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void atualizar({ inicio: isoDe(novaData, novaHora) }) }}>
          <label className="font-medium">Data<input type="date" required value={novaData} onChange={(e) => setNovaData(e.target.value)} className={campo} /></label>
          <label className="font-medium">Hora<input type="time" required value={novaHora} onChange={(e) => setNovaHora(e.target.value)} className={campo} /></label>
          <Button type="submit" size="sm">Remarcar</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setModo('ver')}>Voltar</Button>
        </form>
      )}
      {erro && <p role="alert" className="text-destructive">{erro}</p>}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Régua de lembretes</p>
        {lembretes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{c.status === 'agendado' ? 'Nenhum lembrete pendente.' : 'Sem lembretes: o compromisso foi encerrado.'}</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {lembretes.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span>{ETAPAS[l.etapa] ?? l.etapa} · {l.canal === 'email' ? 'e-mail' : 'no app'}</span>
                <span className="text-muted-foreground">{l.enviado_em ? `enviado ${formatarData(l.enviado_em)}` : new Date(l.enviar_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
