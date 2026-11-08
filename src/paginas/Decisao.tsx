// Uma decisão: análise de apoio (critérios com pesos ajustáveis, alternativas com pontuação,
// riscos, alçada, o que falta saber), registro da escolha e revisão depois.
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Cartao, Estado } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { hojeSaoPaulo, somarDias } from '@/dominio/combinados'
import { type AnaliseGravada, lerAnalise, pontuar, ROTULO_ALCADA, ROTULO_REVERSIBILIDADE, ROTULO_STATUS_DECISAO, type StatusDecisao } from '@/dominio/decisoes'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { chamarFuncao } from '@/servicos/funcoes'
import type { Database } from '@/tipos/banco'

type DecisaoComPessoa = Database['public']['Tables']['decisao']['Row'] & { colaborador: { nome: string } | null }

const campo = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal'

export function Decisao() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const [recarga, setRecarga] = useState(0)
  const [analisando, setAnalisando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const consulta = useConsulta(async (): Promise<DecisaoComPessoa> => exigir(await supabase.from('decisao').select('*, colaborador:colaborador_id(nome)').eq('id', id).single()), [id, recarga])
  const pediu = useRef(false)

  async function analisar() {
    setAnalisando(true)
    setErro(null)
    try {
      await chamarFuncao('apoiar-decisao', { decisao_id: id })
      setRecarga((n) => n + 1)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setAnalisando(false)
    }
  }

  useEffect(() => {
    if (params.get('analisar') && !pediu.current) {
      pediu.current = true
      setParams({}, { replace: true })
      void analisar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Estado consulta={consulta}>
      {(d) => {
        const analise = lerAnalise(d.analise)
        return (
          <div className="flex max-w-5xl flex-col gap-5">
            <header>
              <Link to="/decisoes" className="text-sm text-muted-foreground hover:underline">← Decisões</Link>
              <h1 className="text-2xl font-semibold">{d.titulo}</h1>
              <p className="text-sm text-muted-foreground">
                {ROTULO_STATUS_DECISAO[d.status as StatusDecisao]}
                {d.prazo_decisao ? ` · decidir até ${formatarData(d.prazo_decisao)}` : ''}
                {d.colaborador?.nome ? ` · pessoa mais afetada: ${d.colaborador.nome}` : ''}
              </p>
            </header>
            <Cartao titulo="A decisão">
              <p className="text-sm">{d.pergunta}</p>
              {d.contexto && <p className="mt-2 text-sm text-muted-foreground">{d.contexto}</p>}
              {d.opcoes_iniciais.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Opções que você trouxe: {d.opcoes_iniciais.join(' · ')}</p>}
              {d.status === 'em_analise' && (
                <div className="mt-3 flex items-center gap-3">
                  <Button onClick={analisar} disabled={analisando}>{analisando ? 'Analisando… (até 1 minuto)' : analise ? 'Refazer a análise' : 'Analisar com o Copiloto'}</Button>
                  {analise && d.versao_analise > 0 && <span className="text-xs text-muted-foreground">Versão {d.versao_analise} da análise</span>}
                </div>
              )}
              {erro && <p role="alert" className="mt-2 text-sm text-destructive">{erro}</p>}
            </Cartao>

            {analise?.tipo === 'encaminhamento' && (
              <Cartao titulo="Encaminhamento">
                <p className="text-sm">{analise.motivo}</p>
                <p className="mt-2 text-sm">Esta decisão não deve ser tomada só por você. Procure o canal da empresa:</p>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {Object.entries(analise.canais ?? {}).map(([k, v]) => <li key={k}>{v}</li>)}
                </ul>
              </Cartao>
            )}
            {analise?.tipo === 'analise' && <PainelAnalise analise={analise} />}

            {d.status === 'em_analise' && analise?.tipo !== 'encaminhamento' && (
              <RegistrarDecisao id={d.id} alternativas={analise?.tipo === 'analise' ? analise.alternativas.map((a) => a.opcao) : d.opcoes_iniciais} revisaoDias={analise?.tipo === 'analise' ? analise.sugestao_revisao_dias : 30} aoSalvar={() => setRecarga((n) => n + 1)} />
            )}
            {d.status !== 'em_analise' && (
              <Cartao titulo="O que você decidiu">
                <p className="text-sm font-semibold">{d.opcao_escolhida}</p>
                {d.justificativa && <p className="mt-1 text-sm">{d.justificativa}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Decidida em {formatarData(d.decidida_em)}{d.revisar_em ? ` · revisar em ${formatarData(d.revisar_em)}` : ''}</p>
                {d.resultado_revisao ? (
                  <p className="mt-3 rounded bg-secondary p-2 text-sm">Revisão: {d.resultado_revisao}</p>
                ) : (
                  d.status === 'decidida' && <RevisarDecisao id={d.id} aoSalvar={() => setRecarga((n) => n + 1)} />
                )}
              </Cartao>
            )}
          </div>
        )
      }}
    </Estado>
  )
}

function PainelAnalise({ analise }: { analise: Extract<AnaliseGravada, { tipo: 'analise' }> }) {
  const [pesos, setPesos] = useState(analise.criterios.map((c) => ({ criterio: c.criterio, peso: c.peso })))
  const ranking = analise.alternativas.map((a) => ({ ...a, pontuacao: pontuar(a, pesos) })).sort((a, b) => b.pontuacao - a.pontuacao)
  const rotulo = new Map(analise.referencias.map((r) => [r.fonte_id, r.rotulo]))
  return (
    <>
      <Cartao titulo="Leitura do Copiloto">
        <p className="text-sm">{analise.reformulacao}</p>
        <p className={cn('mt-2 inline-block rounded px-2 py-0.5 text-xs font-semibold', analise.alcada.dentro_da_alcada === 'sim' ? 'bg-boomit-verde text-white' : analise.alcada.dentro_da_alcada === 'nao' ? 'bg-destructive text-white' : 'bg-secondary')}>
          {ROTULO_ALCADA[analise.alcada.dentro_da_alcada]}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {analise.alcada.justificativa}
          {analise.alcada.fonte_ids.length > 0 && ` (fonte: ${analise.alcada.fonte_ids.map((f) => rotulo.get(f) ?? f).join(', ')})`}
        </p>
      </Cartao>

      <div className="grid gap-5 md:grid-cols-[18rem_1fr]">
        <Cartao titulo="Critérios e pesos">
          <p className="mb-2 text-xs text-muted-foreground">Ajuste os pesos ao que importa para você. A pontuação muda na hora.</p>
          <ul className="space-y-3">
            {analise.criterios.map((c, i) => (
              <li key={c.criterio} className="text-sm">
                <label className="flex items-center justify-between gap-2 font-medium">
                  {c.criterio}
                  <span className="text-xs text-muted-foreground">peso {pesos[i]!.peso}</span>
                </label>
                <input type="range" min={0} max={5} value={pesos[i]!.peso} aria-label={`Peso de ${c.criterio}`} onChange={(e) => setPesos(pesos.map((p, j) => (j === i ? { ...p, peso: Number(e.target.value) } : p)))} className="w-full accent-boomit-verde" />
                <p className="text-xs text-muted-foreground">{c.por_que}</p>
              </li>
            ))}
          </ul>
        </Cartao>
        <Cartao titulo="Alternativas">
          <p className="mb-3 text-xs text-muted-foreground">Pontuação de 1 a 5 pelos seus pesos: é apoio para pensar, não uma recomendação. Quem decide é você.</p>
          <div className="flex flex-col gap-3">
            {ranking.map((a) => (
              <article key={a.opcao} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{a.opcao}</h3>
                  <span className="text-xs text-muted-foreground">{ROTULO_REVERSIBILIDADE[a.reversibilidade]} · <strong className="text-base text-foreground">{a.pontuacao.toFixed(1)}</strong></span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-secondary"><div className="h-1.5 rounded bg-boomit-verde" style={{ width: `${(a.pontuacao / 5) * 100}%` }} /></div>
                <p className="mt-2">{a.descricao}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <Lista titulo="Prós" itens={a.pros} />
                  <Lista titulo="Contras" itens={a.contras} />
                  <Lista titulo="Riscos" itens={a.riscos} />
                </div>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Notas por critério</summary>
                  <ul className="mt-1 space-y-0.5">{a.notas.map((n) => <li key={n.criterio}>{n.criterio}: {n.nota} {n.justificativa && `· ${n.justificativa}`}</li>)}</ul>
                </details>
              </article>
            ))}
          </div>
        </Cartao>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Cartao titulo="Fatos considerados">
          {analise.fatos_considerados.length ? (
            <ul className="space-y-1 text-sm">{analise.fatos_considerados.map((f) => <li key={f.texto}>{f.texto} <span className="text-xs text-muted-foreground">({f.fonte_ids.map((x) => rotulo.get(x) ?? x).join(', ')})</span></li>)}</ul>
          ) : <p className="text-sm text-muted-foreground">Nenhum fato com fonte no contexto.</p>}
        </Cartao>
        <Cartao titulo="Antes de decidir, confirme">
          <ul className="space-y-1 text-sm">{analise.informacoes_faltantes.map((f) => <li key={f.pergunta}>{f.pergunta} <span className="text-xs text-muted-foreground">· {f.por_que_importa}</span></li>)}</ul>
        </Cartao>
        <Cartao titulo="Quem consultar"><Lista itens={analise.quem_consultar} /></Cartao>
        <Cartao titulo="Pessoas afetadas e comunicação"><Lista itens={analise.impacto_em_pessoas} /></Cartao>
        <Cartao titulo="Próximos passos" className="md:col-span-2"><Lista itens={analise.proximos_passos} numerada /></Cartao>
      </div>
    </>
  )
}

function Lista({ titulo, itens, numerada }: { titulo?: string; itens: string[]; numerada?: boolean }) {
  const Tag = numerada ? 'ol' : 'ul'
  return (
    <div>
      {titulo && <p className="text-xs font-semibold text-muted-foreground">{titulo}</p>}
      {itens.length ? <Tag className={cn('pl-4 text-sm', numerada ? 'list-decimal' : 'list-disc')}>{itens.map((i) => <li key={i}>{i}</li>)}</Tag> : <p className="text-xs text-muted-foreground">—</p>}
    </div>
  )
}

function RegistrarDecisao({ id, alternativas, revisaoDias, aoSalvar }: { id: string; alternativas: string[]; revisaoDias: number; aoSalvar: () => void }) {
  const [opcao, setOpcao] = useState('')
  const [outra, setOutra] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [revisar, setRevisar] = useState(somarDias(hojeSaoPaulo(), revisaoDias))
  const [erro, setErro] = useState<string | null>(null)
  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const escolhida = opcao === '__outra' ? outra.trim() : opcao
    if (!escolhida) return setErro('Escolha uma opção ou descreva a sua.')
    const r = await supabase.from('decisao').update({ status: 'decidida', opcao_escolhida: escolhida, justificativa: justificativa.trim() || null, decidida_em: new Date().toISOString(), revisar_em: revisar || null }).eq('id', id)
    if (r.error) setErro(r.error.message)
    else aoSalvar()
  }
  return (
    <Cartao titulo="Registrar a decisão">
      <form onSubmit={salvar} className="flex flex-col gap-3 text-sm font-medium">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1">O que você decidiu?</legend>
          {alternativas.map((a) => (
            <label key={a} className="flex items-center gap-2 font-normal"><input type="radio" name="opcao" value={a} checked={opcao === a} onChange={() => setOpcao(a)} />{a}</label>
          ))}
          <label className="flex items-center gap-2 font-normal"><input type="radio" name="opcao" value="__outra" checked={opcao === '__outra'} onChange={() => setOpcao('__outra')} />Outra</label>
          {opcao === '__outra' && <input value={outra} onChange={(e) => setOutra(e.target.value)} placeholder="Descreva a decisão" className={campo} />}
        </fieldset>
        <label>Por quê? <span className="font-normal text-muted-foreground">(ajuda a revisar depois)</span><textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} className={campo} /></label>
        <label className="max-w-xs">Revisar em<input type="date" value={revisar} onChange={(e) => setRevisar(e.target.value)} className={campo} /></label>
        <p className="text-xs font-normal text-muted-foreground">Na data da revisão você recebe um lembrete para registrar se a decisão funcionou.</p>
        {erro && <p role="alert" className="text-destructive">{erro}</p>}
        <div><Button type="submit">Registrar decisão</Button></div>
      </form>
    </Cartao>
  )
}

function RevisarDecisao({ id, aoSalvar }: { id: string; aoSalvar: () => void }) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  return (
    <form
      className="mt-3 flex flex-col gap-2 text-sm"
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await supabase.from('decisao').update({ status: 'revisada', resultado_revisao: texto.trim() }).eq('id', id)
        if (r.error) setErro(r.error.message)
        else aoSalvar()
      }}
    >
      <label className="font-medium">Revisão: a decisão funcionou? O que você mudaria?<textarea required rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} className={campo} /></label>
      {erro && <p role="alert" className="text-destructive">{erro}</p>}
      <div><Button type="submit" size="sm" variant="outline">Registrar revisão</Button></div>
    </form>
  )
}
