// Apoio à tomada de decisão (inclusão de 08/11/2026): lista e nova decisão.
// Qualquer decisão de gestão (escala, prioridade, ferramenta, processo), não só sobre pessoas.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado, Numero } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { hojeSaoPaulo } from '@/dominio/combinados'
import { ROTULO_STATUS_DECISAO, type StatusDecisao } from '@/dominio/decisoes'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { carregarEquipe } from './agenda/carregar'

const campo = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal'

export function Decisoes() {
  const { vinculo } = useSessao()
  const [nova, setNova] = useState(false)
  const consulta = useConsulta(async () => exigir(await supabase.from('decisao').select('id, titulo, status, prazo_decisao, revisar_em, opcao_escolhida, versao_analise, criado_em, colaborador:colaborador_id(nome)').order('criado_em', { ascending: false })), [])
  if (vinculo?.papel !== 'lider') return <p className="text-muted-foreground">O apoio à decisão é da liderança: entre como líder.</p>
  const hoje = hojeSaoPaulo()

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Apoio à decisão</p>
          <h1 className="text-2xl font-semibold">Decisões</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Descreva a decisão e o Copiloto organiza critérios, alternativas, riscos, o que falta saber e a sua alçada. Ele não decide: a escolha e o registro são seus.
          </p>
        </div>
        <Button onClick={() => setNova((v) => !v)}>{nova ? 'Fechar' : 'Nova decisão'}</Button>
      </header>
      {nova && vinculo && <NovaDecisao />}
      <Estado consulta={consulta}>
        {(lista) => {
          const emAnalise = lista.filter((d) => d.status === 'em_analise')
          const revisar = lista.filter((d) => d.status === 'decidida' && d.revisar_em && d.revisar_em <= hoje)
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Numero rotulo="Em análise" valor={emAnalise.length} />
                <Numero rotulo="Prazo vencido" valor={emAnalise.filter((d) => d.prazo_decisao && d.prazo_decisao < hoje).length} />
                <Numero rotulo="Para revisar" valor={revisar.length} detalhe="Decisões com revisão marcada" />
              </div>
              <Cartao titulo="Suas decisões">
                {lista.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma decisão ainda. Comece por uma que está na sua mesa esta semana.</p>
                ) : (
                  <ul className="divide-y">
                    {lista.map((d) => {
                      const atrasada = d.status === 'em_analise' && d.prazo_decisao && d.prazo_decisao < hoje
                      return (
                        <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                          <div>
                            <Link to={`/decisoes/${d.id}`} className="font-semibold hover:underline">{d.titulo}</Link>
                            <p className="text-xs text-muted-foreground">
                              {ROTULO_STATUS_DECISAO[d.status as StatusDecisao]}
                              {d.colaborador?.nome ? ` · ${d.colaborador.nome}` : ''}
                              {d.opcao_escolhida ? ` · escolha: ${d.opcao_escolhida}` : ''}
                              {d.status === 'em_analise' && !d.versao_analise ? ' · sem análise ainda' : ''}
                            </p>
                          </div>
                          <span className={cn('text-xs', atrasada ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                            {d.status === 'em_analise' ? (d.prazo_decisao ? `decidir até ${formatarData(d.prazo_decisao)}` : 'sem prazo') : d.revisar_em ? `revisar em ${formatarData(d.revisar_em)}` : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Cartao>
            </>
          )
        }}
      </Estado>
    </div>
  )
}

function NovaDecisao() {
  const { vinculo } = useSessao()
  const navegar = useNavigate()
  const equipe = useConsulta(() => (vinculo ? carregarEquipe(vinculo) : Promise.resolve([])), [vinculo?.colaborador_id])
  const [titulo, setTitulo] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [contexto, setContexto] = useState('')
  const [opcoes, setOpcoes] = useState('')
  const [prazo, setPrazo] = useState('')
  const [pessoa, setPessoa] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!vinculo?.colaborador_id) return
    setSalvando(true)
    setErro(null)
    const id = crypto.randomUUID()
    const r = await supabase.from('decisao').insert({
      id, empresa_id: vinculo.empresa_id, lider_id: vinculo.colaborador_id, colaborador_id: pessoa || null,
      titulo: titulo.trim(), pergunta: pergunta.trim(), contexto: contexto.trim() || null,
      opcoes_iniciais: opcoes.split('\n').map((o) => o.trim()).filter(Boolean).slice(0, 6), prazo_decisao: prazo || null,
    })
    setSalvando(false)
    if (r.error) return setErro(r.error.message)
    navegar(`/decisoes/${id}?analisar=1`)
  }

  return (
    <Cartao titulo="Nova decisão">
      <form onSubmit={salvar} className="grid gap-3 text-sm font-medium sm:grid-cols-2">
        <label className="sm:col-span-2">
          Nome curto
          <input required maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Escala de plantão de dezembro" className={campo} />
        </label>
        <label className="sm:col-span-2">
          O que precisa ser decidido?
          <textarea required minLength={10} rows={2} value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex.: Como dividir o plantão entre as 4 pessoas do suporte sem prejudicar o atendimento?" className={campo} />
        </label>
        <label className="sm:col-span-2">
          Contexto <span className="font-normal text-muted-foreground">(o que você já sabe, restrições)</span>
          <textarea rows={3} value={contexto} onChange={(e) => setContexto(e.target.value)} className={campo} />
        </label>
        <label>
          Opções que você já considera <span className="font-normal text-muted-foreground">(uma por linha)</span>
          <textarea rows={3} value={opcoes} onChange={(e) => setOpcoes(e.target.value)} placeholder={'Rodízio semanal\nContratar temporário'} className={campo} />
        </label>
        <div className="flex flex-col gap-3">
          <label>
            Decidir até
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo} />
          </label>
          <label>
            Pessoa mais afetada <span className="font-normal text-muted-foreground">(opcional)</span>
            <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} className={campo}>
              <option value="">Nenhuma em especial</option>
              {(equipe.estado === 'pronto' ? equipe.dados : []).map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs font-normal text-muted-foreground sm:col-span-2">
          Com prazo, você recebe um lembrete na véspera (no app e por e-mail). Decisões sobre desligar, promover ou punir alguém não são pontuadas: o Copiloto organiza os fatos e indica quem consultar.
        </p>
        {erro && <p role="alert" className="text-destructive sm:col-span-2">{erro}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e analisar'}</Button>
        </div>
      </form>
    </Cartao>
  )
}
