// M6 · Revisão de um documento (Sprint 4): pessoas vinculadas, extrações com o trecho de origem
// (confirmar, editar ou descartar) e planejado × combinado. Confirmado vira combinado aberto.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado } from '@/components/Estado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { compararPlanejado, ROTULO_COMPARACAO } from '@/dominio/comparacao'
import { conteudoPreparacaoSchema, ROTULO_RESPONSAVEL } from '@/dominio/preparacao'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { chamarFuncao } from '@/servicos/funcoes'
import type { Json } from '@/tipos/banco'
import { ROTULO_STATUS_DOC, ROTULO_TIPO_DOC } from '@/dominio/documentos'

interface ConteudoExtracao {
  descricao: string
  responsavel_nome: string | null
  prazo: string | null
  prazo_origem: 'texto' | 'relativo' | null
}

async function carregar(id: string, liderId: string | null) {
  const doc = await supabase.from('documento_fonte').select('id, empresa_id, lider_id, titulo, tipo, data_evento, status_processamento, erro, formato').eq('id', id).maybeSingle()
  if (doc.error) throw new Error(doc.error.message)
  if (!doc.data) return null
  const [vinculadas, trechos, extracoes, equipe] = await Promise.all([
    supabase.from('documento_colaborador').select('colaborador_id, confirmado, colaborador:colaborador_id(nome)').eq('documento_id', id),
    supabase.from('trecho').select('id, ordem, texto, locutor').eq('documento_id', id).order('ordem'),
    supabase.from('extracao').select('id, tipo, conteudo, confianca, status_revisao, trecho_id').eq('documento_id', id).order('criado_em'),
    liderId ? supabase.from('vinculo_lideranca').select('liderado:liderado_id(id, nome)').eq('lider_id', liderId).is('fim', null) : Promise.resolve({ data: [], error: null }),
  ])
  const pessoas = exigir(vinculadas).map((v) => ({ id: v.colaborador_id, nome: v.colaborador?.nome ?? '—', confirmado: v.confirmado }))
  // Planejado: combinados propostos na preparação mais recente de uma das pessoas confirmadas.
  let planejado: { titulo: string; propostos: string[] } | null = null
  const confirmadas = pessoas.filter((p) => p.confirmado).map((p) => p.id)
  if (confirmadas.length) {
    const sit = await supabase.from('situacao').select('id, titulo, preparacao(versao, conteudo)').in('colaborador_id', confirmadas).eq('sensivel', false).order('criado_em', { ascending: false }).limit(1).maybeSingle()
    const ultima = [...(sit.data?.preparacao ?? [])].sort((a, b) => b.versao - a.versao)[0]
    const conteudo = ultima ? conteudoPreparacaoSchema.safeParse(ultima.conteudo) : null
    if (sit.data && conteudo?.success) planejado = { titulo: sit.data.titulo, propostos: conteudo.data.plano.combinados_propostos.map((c) => c.descricao) }
  }
  return {
    doc: doc.data,
    pessoas,
    trechos: new Map(exigir(trechos).map((t) => [t.id, t])),
    extracoes: exigir(extracoes).map((e) => ({ ...e, conteudo: e.conteudo as unknown as ConteudoExtracao })),
    equipe: (equipe.data ?? []).map((v) => v.liderado).filter((p): p is { id: string; nome: string } => Boolean(p)),
    planejado,
  }
}

export function Documento() {
  const { id = '' } = useParams()
  const { vinculo } = useSessao()
  const [recarga, setRecarga] = useState(0)
  const consulta = useConsulta(() => carregar(id, vinculo?.colaborador_id ?? null), [id, vinculo?.colaborador_id, recarga])
  const recarregar = () => setRecarga((n) => n + 1)

  // Enquanto processa, atualiza a cada 3 segundos.
  const status = consulta.estado === 'pronto' ? consulta.dados?.doc.status_processamento : null
  useEffect(() => {
    if (status !== 'recebido' && status !== 'processando') return
    const t = setTimeout(() => setRecarga((n) => n + 1), 3000)
    return () => clearTimeout(t)
  }, [status, recarga])

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link to="/fontes" className="text-sm text-muted-foreground hover:underline">
        ← Fontes e evidências
      </Link>
      <Estado consulta={consulta}>
        {(d) =>
          !d ? (
            <p className="text-muted-foreground">Documento não encontrado.</p>
          ) : (
            <>
              <header>
                <p className="text-sm text-muted-foreground">
                  {ROTULO_TIPO_DOC[d.doc.tipo]} · {formatarData(d.doc.data_evento)}
                  {d.doc.formato === 'gemini_notas' && ' · anotações do Gemini'}
                  {d.doc.formato === 'transcricao' && ' · transcrição com locutores'}
                </p>
                <h1 className="text-2xl font-semibold">{d.doc.titulo}</h1>
                <p className="mt-1 text-sm">
                  <Badge variant="outline">{ROTULO_STATUS_DOC[d.doc.status_processamento]}</Badge>
                  {(d.doc.status_processamento === 'recebido' || d.doc.status_processamento === 'processando') && (
                    <span className="ml-2 text-muted-foreground">Lendo o documento e extraindo os combinados…</span>
                  )}
                </p>
                {d.doc.status_processamento === 'erro' && (
                  <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {d.doc.erro}{' '}
                    <button type="button" className="underline" onClick={() => chamarFuncao('processar-documento', { documento_id: d.doc.id }).then(recarregar, recarregar)}>
                      Tentar de novo
                    </button>
                  </div>
                )}
              </header>

              <Pessoas documentoId={d.doc.id} pessoas={d.pessoas} equipe={d.equipe} aoMudar={recarregar} />

              {d.doc.status_processamento === 'processado' && (
                <>
                  {d.planejado && (
                    <Comparacao
                      titulo={d.planejado.titulo}
                      propostos={d.planejado.propostos}
                      combinados={d.extracoes.filter((e) => e.tipo === 'combinado' && e.status_revisao !== 'descartado').map((e) => e.conteudo.descricao)}
                    />
                  )}
                  <Extracoes dados={d} liderId={vinculo?.colaborador_id ?? null} aoMudar={recarregar} />
                </>
              )}
            </>
          )
        }
      </Estado>
    </div>
  )
}

function Pessoas({ documentoId, pessoas, equipe, aoMudar }: { documentoId: string; pessoas: { id: string; nome: string; confirmado: boolean }[]; equipe: { id: string; nome: string }[]; aoMudar: () => void }) {
  const [nova, setNova] = useState('')
  const restantes = equipe.filter((p) => !pessoas.some((x) => x.id === p.id))
  return (
    <Cartao titulo="Pessoas da reunião">
      <p className="mb-2 text-xs text-muted-foreground">Os trechos só entram no contexto de quem você confirmar.</p>
      <ul className="flex flex-wrap gap-2 text-sm">
        {pessoas.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={p.confirmado}
              onClick={async () => {
                await supabase.from('documento_colaborador').update({ confirmado: !p.confirmado }).eq('documento_id', documentoId).eq('colaborador_id', p.id)
                aoMudar()
              }}
              className={cn('rounded-full border px-3 py-1', p.confirmado ? 'border-primary bg-primary text-primary-foreground' : 'border-dashed')}
            >
              {p.nome} {p.confirmado ? '✓' : '· sugerida, clique para confirmar'}
            </button>
          </li>
        ))}
        {pessoas.length === 0 && <li className="text-muted-foreground">Nenhuma pessoa identificada.</li>}
      </ul>
      {restantes.length > 0 && (
        <div className="mt-3 flex gap-2 text-sm">
          <select aria-label="Adicionar pessoa" value={nova} onChange={(e) => setNova(e.target.value)} className="rounded-md border bg-background px-2 py-1">
            <option value="">Adicionar pessoa…</option>
            {restantes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!nova}
            onClick={async () => {
              await supabase.from('documento_colaborador').insert({ documento_id: documentoId, colaborador_id: nova, confirmado: true })
              setNova('')
              aoMudar()
            }}
          >
            Adicionar
          </Button>
        </div>
      )}
    </Cartao>
  )
}

const COR_COMPARACAO = { como_planejado: 'bg-boomit-verde text-boomit-claro', alterado: 'bg-boomit-taupe text-boomit-claro', nao_tratado: 'bg-destructive text-white', novo: 'bg-boomit-cinza-azulado text-boomit-preto' }

function Comparacao({ titulo, propostos, combinados }: { titulo: string; propostos: string[]; combinados: string[] }) {
  const { linhas, novos } = compararPlanejado(propostos, combinados)
  return (
    <Cartao titulo="Planejado × combinado na reunião">
      <p className="mb-3 text-xs text-muted-foreground">Comparação com a preparação "{titulo}". É uma aproximação por palavras: confira.</p>
      <ul className="space-y-2 text-sm">
        {linhas.map((l) => (
          <li key={l.planejado} className="rounded border p-2">
            <Badge className={COR_COMPARACAO[l.resultado]}>{ROTULO_COMPARACAO[l.resultado]}</Badge> <span className="font-medium">{l.planejado}</span>
            {l.combinado && <span className="block text-muted-foreground">Na reunião: {l.combinado}</span>}
          </li>
        ))}
        {novos.map((n) => (
          <li key={n} className="rounded border p-2">
            <Badge className={COR_COMPARACAO.novo}>{ROTULO_COMPARACAO.novo}</Badge> {n}
          </li>
        ))}
      </ul>
    </Cartao>
  )
}

type Dados = NonNullable<Awaited<ReturnType<typeof carregar>>>

function Extracoes({ dados, liderId, aoMudar }: { dados: Dados; liderId: string | null; aoMudar: () => void }) {
  const pendentes = dados.extracoes.filter((e) => e.status_revisao === 'pendente')
  const revisadas = dados.extracoes.filter((e) => e.status_revisao !== 'pendente')
  const grupos = [
    ['combinado', 'Combinados para revisar'],
    ['decisao', 'Decisões'],
    ['tema', 'Temas discutidos'],
  ] as const
  return (
    <>
      {dados.extracoes.length === 0 && (
        <Cartao titulo="Extração">
          <p className="text-sm text-muted-foreground">Nenhum combinado, decisão ou tema encontrado neste documento.</p>
        </Cartao>
      )}
      {grupos.map(([tipo, titulo]) => {
        const itens = pendentes.filter((e) => e.tipo === tipo)
        if (!itens.length) return null
        return (
          <Cartao key={tipo} titulo={`${titulo} · ${itens.length}`}>
            <ul className="space-y-3">
              {itens.map((e) => (
                <ItemExtraido key={e.id} item={e} dados={dados} liderId={liderId} aoMudar={aoMudar} />
              ))}
            </ul>
          </Cartao>
        )
      })}
      {revisadas.length > 0 && (
        <Cartao titulo={`Já revisados · ${revisadas.length}`}>
          <ul className="space-y-1 text-sm">
            {revisadas.map((e) => (
              <li key={e.id} className={cn(e.status_revisao === 'descartado' && 'text-muted-foreground line-through')}>
                {e.conteudo.descricao} <span className="text-xs text-muted-foreground no-underline">· {e.status_revisao === 'aprovado' ? 'confirmado' : 'descartado'}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  )
}

function ItemExtraido({ item, dados, liderId, aoMudar }: { item: Dados['extracoes'][number]; dados: Dados; liderId: string | null; aoMudar: () => void }) {
  const confirmadas = dados.pessoas.filter((p) => p.confirmado)
  const [descricao, setDescricao] = useState(item.conteudo.descricao)
  const [prazo, setPrazo] = useState(item.conteudo.prazo ?? '')
  const [responsavel, setResponsavel] = useState<'lider' | 'colaborador' | 'outro'>(item.conteudo.responsavel_nome ? 'colaborador' : 'lider')
  const [pessoa, setPessoa] = useState(confirmadas[0]?.id ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const trecho = item.trecho_id ? dados.trechos.get(item.trecho_id) : undefined

  async function revisar(status: 'aprovado' | 'descartado') {
    setSalvando(true)
    setErro(null)
    if (status === 'aprovado' && item.tipo === 'combinado') {
      if (!liderId) return setErro('Seu usuário não está ligado a um líder.')
      const ins = await supabase.from('combinado').insert({
        empresa_id: dados.doc.empresa_id,
        lider_id: liderId,
        colaborador_id: pessoa || null,
        documento_id: dados.doc.id,
        trecho_id: item.trecho_id,
        descricao: descricao.trim(),
        responsavel_tipo: responsavel,
        responsavel_nome: item.conteudo.responsavel_nome,
        prazo: prazo || null,
        status: 'aberto',
        origem: 'transcricao',
      })
      if (ins.error) {
        setSalvando(false)
        return setErro(ins.error.message)
      }
    }
    const up = await supabase
      .from('extracao')
      .update({ status_revisao: status, conteudo: { ...item.conteudo, descricao: descricao.trim(), prazo: prazo || null } as unknown as Json })
      .eq('id', item.id)
    setSalvando(false)
    if (up.error) setErro(up.error.message)
    else aoMudar()
  }

  return (
    <li className="rounded border p-3 text-sm">
      {item.tipo === 'combinado' ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_10rem]">
          <input aria-label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="rounded-md border bg-background px-2 py-1" />
          <select aria-label="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value as typeof responsavel)} className="rounded-md border bg-background px-2 py-1">
            {Object.entries(ROTULO_RESPONSAVEL).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
          <select aria-label="Pessoa" value={pessoa} onChange={(e) => setPessoa(e.target.value)} className="rounded-md border bg-background px-2 py-1">
            <option value="">Sem pessoa</option>
            {confirmadas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <input type="date" aria-label="Prazo" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="rounded-md border bg-background px-2 py-1" />
        </div>
      ) : (
        <p className="font-medium">{descricao}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {item.conteudo.responsavel_nome && `Responsável no texto: ${item.conteudo.responsavel_nome} · `}
        {item.conteudo.prazo_origem === 'relativo' && 'Prazo calculado a partir da data da reunião · '}
        {item.tipo === 'combinado' && !item.conteudo.prazo && 'Sem prazo no texto: defina um · '}
        confiança {Math.round((item.confianca ?? 0) * 100)}%
      </p>
      {trecho && (
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer text-muted-foreground">Trecho de origem</summary>
          <p className="mt-1 whitespace-pre-wrap rounded bg-secondary p-2">{trecho.texto}</p>
        </details>
      )}
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => revisar('aprovado')} disabled={salvando || !descricao.trim()}>
          {item.tipo === 'combinado' ? 'Confirmar combinado' : 'Manter'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => revisar('descartado')} disabled={salvando}>
          Descartar
        </Button>
      </div>
      {erro && <p className="mt-1 text-xs text-destructive">{erro}</p>}
    </li>
  )
}
