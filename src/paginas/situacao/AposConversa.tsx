// Depois da conversa real: registrar a aplicação (data + relato) e revisar os combinados.
// Regra 5: combinados entram como pendente_revisao e só valem depois que o líder confirma.
// Regra 11: só a data registrada aqui transforma o ensaio em aplicação.
import { useState } from 'react'
import { Cartao, Estado } from '@/components/Estado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { estaVencido, hojeSaoPaulo, ROTULO_STATUS_COMBINADO, somarDias, type StatusCombinado } from '@/dominio/combinados'
import { type CombinadoProposto, type Extensao, ROTULO_RESPONSAVEL } from '@/dominio/preparacao'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'

interface Props {
  situacaoId: string
  empresaId: string
  colaboradorId: string | null
  liderId: string | null
  aplicadaEm: string | null
  relatoAplicacao: string | null
  propostos: CombinadoProposto[]
  /** Ações de PDI propostas (tipo pdi); gravadas conforme empresa.config.modo_pdi. */
  acoesPdi?: Extract<Extensao, { tipo: 'pdi' }>['acoes_desenvolvimento']
  modoPdi?: string
  aoMudar: () => void
}

// docs/01 §3: boomit → referência ao PDI Boomit; integrado → sistema interno; nativo → Copiloto.
const ORIGEM_POR_MODO: Record<string, 'boomit_pdi' | 'sistema_interno' | 'copiloto'> = { boomit: 'boomit_pdi', integrado: 'sistema_interno', nativo: 'copiloto' }

interface CombinadoLinha {
  id: string
  descricao: string
  responsavel_tipo: string
  prazo: string | null
  status: StatusCombinado
  evidencia_esperada: string | null
}

export function AposConversa(p: Props) {
  const [recarga, setRecarga] = useState(0)
  const combinados = useConsulta(
    async () =>
      exigir(
        await supabase
          .from('combinado')
          .select('id, descricao, responsavel_tipo, prazo, status, evidencia_esperada')
          .eq('situacao_id', p.situacaoId)
          .neq('status', 'cancelado')
          .order('prazo'),
      ) as CombinadoLinha[],
    [p.situacaoId, recarga],
  )
  const recarregar = () => setRecarga((n) => n + 1)

  return p.aplicadaEm ? (
    <Cartao titulo="Depois da conversa">
      <p className="text-sm">
        <span className="font-medium">Conversa realizada em {formatarData(p.aplicadaEm)}.</span> {p.relatoAplicacao}
      </p>
      <h3 className="mt-4 mb-2 text-sm font-semibold">Combinados</h3>
      <Estado consulta={combinados}>{(lista) => <ListaCombinados lista={lista} aoMudar={recarregar} />}</Estado>
    </Cartao>
  ) : (
    <RegistrarAplicacao
      {...p}
      aoMudar={() => {
        p.aoMudar()
        recarregar()
      }}
    />
  )
}

function RegistrarAplicacao(p: Props) {
  const hoje = hojeSaoPaulo()
  const [data, setData] = useState(hoje)
  const [relato, setRelato] = useState('')
  const [escolhidos, setEscolhidos] = useState(p.propostos.map(() => true))
  const [acoesEscolhidas, setAcoesEscolhidas] = useState((p.acoesPdi ?? []).map(() => true))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function registrar() {
    if (!p.liderId) return setErro('Seu usuário não está ligado a um colaborador líder.')
    setSalvando(true)
    setErro(null)
    const sit = await supabase
      .from('situacao')
      .update({ status: 'aplicada', aplicada_em: `${data}T12:00:00-03:00`, relato_aplicacao: relato.trim() })
      .eq('id', p.situacaoId)
    if (sit.error) {
      setSalvando(false)
      return setErro(`Não foi possível registrar: ${sit.error.message}`)
    }
    const novos = p.propostos
      .filter((_, i) => escolhidos[i])
      .map((c) => ({
        empresa_id: p.empresaId,
        lider_id: p.liderId!,
        colaborador_id: p.colaboradorId,
        situacao_id: p.situacaoId,
        descricao: c.descricao,
        responsavel_tipo: c.responsavel,
        prazo: somarDias(data, c.prazo_sugerido_dias),
        evidencia_esperada: c.evidencia_esperada,
        origem: 'preparacao' as const,
        status: 'pendente_revisao' as const,
      }))
    if (novos.length) {
      const ins = await supabase.from('combinado').insert(novos)
      if (ins.error) setErro(`Conversa registrada, mas os combinados não foram salvos: ${ins.error.message}`)
    }
    const acoes = (p.acoesPdi ?? []).filter((_, i) => acoesEscolhidas[i])
    if (acoes.length && p.colaboradorId) {
      const ins = await supabase.from('acao_desenvolvimento').insert(
        acoes.map((a) => ({
          empresa_id: p.empresaId,
          colaborador_id: p.colaboradorId!,
          situacao_id: p.situacaoId,
          competencia: a.competencia,
          descricao: `${a.acao} (apoio: ${a.apoio}; evidência: ${a.evidencia})`,
          prazo: somarDias(data, a.prazo_dias),
          origem: ORIGEM_POR_MODO[p.modoPdi ?? 'boomit'] ?? 'boomit_pdi',
        })),
      )
      if (ins.error) setErro(`Conversa registrada, mas as ações de PDI não foram salvas: ${ins.error.message}`)
    }
    setSalvando(false)
    p.aoMudar()
  }

  return (
    <Cartao titulo="Depois da conversa real">
      <p className="mb-3 text-sm text-muted-foreground">Registre quando a conversa aconteceu. Só assim ela aparece como aplicação na linha do tempo.</p>
      <div className="grid gap-3">
        <label className="text-sm font-medium">
          Data da conversa
          <input type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} className="mt-1 block rounded-md border bg-background px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Como foi (fatos, em poucas frases)
          <textarea rows={3} value={relato} onChange={(e) => setRelato(e.target.value)} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal" />
        </label>
        {p.propostos.length > 0 && (
          <fieldset>
            <legend className="text-sm font-medium">Combinados para revisar depois</legend>
            <ul className="mt-1 space-y-1">
              {p.propostos.map((c, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={escolhidos[i]} onChange={() => setEscolhidos((l) => l.map((x, j) => (j === i ? !x : x)))} />
                    <span>
                      {c.descricao}{' '}
                      <span className="text-muted-foreground">
                        · {ROTULO_RESPONSAVEL[c.responsavel]} · prazo {formatarData(somarDias(data, c.prazo_sugerido_dias))}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        {(p.acoesPdi ?? []).length > 0 && (
          <fieldset>
            <legend className="text-sm font-medium">Ações de desenvolvimento combinadas</legend>
            <ul className="mt-1 space-y-1">
              {(p.acoesPdi ?? []).map((a, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={acoesEscolhidas[i]} onChange={() => setAcoesEscolhidas((l) => l.map((x, j) => (j === i ? !x : x)))} />
                    <span>
                      {a.competencia}: {a.acao} <span className="text-muted-foreground">· prazo {formatarData(somarDias(data, a.prazo_dias))}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <div>
          <Button onClick={registrar} disabled={salvando || !relato.trim() || !data || data > hoje}>
            {salvando ? 'Registrando…' : 'Registrar a conversa'}
          </Button>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>
    </Cartao>
  )
}

export function ListaCombinados({ lista, aoMudar, mostrarPessoa = false }: { lista: (CombinadoLinha & { pessoa?: string | null })[]; aoMudar: () => void; mostrarPessoa?: boolean }) {
  if (lista.length === 0) return <p className="text-sm text-muted-foreground">Nenhum combinado.</p>
  return (
    <ul className="space-y-2">
      {lista.map((c) => (c.status === 'pendente_revisao' ? <Pendente key={c.id} c={c} aoMudar={aoMudar} mostrarPessoa={mostrarPessoa} /> : <Confirmado key={c.id} c={c} mostrarPessoa={mostrarPessoa} />))}
    </ul>
  )
}

function Confirmado({ c, mostrarPessoa }: { c: CombinadoLinha & { pessoa?: string | null }; mostrarPessoa: boolean }) {
  const vencido = estaVencido(c)
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded border p-3 text-sm">
      <Badge className={vencido ? 'bg-destructive text-white' : 'bg-boomit-verde text-boomit-claro'}>{vencido ? 'Vencido' : ROTULO_STATUS_COMBINADO[c.status]}</Badge>
      <span className="font-medium">{c.descricao}</span>
      <span className="text-muted-foreground">
        {mostrarPessoa && c.pessoa ? `${c.pessoa} · ` : ''}
        {ROTULO_RESPONSAVEL[c.responsavel_tipo as keyof typeof ROTULO_RESPONSAVEL] ?? c.responsavel_tipo} · prazo {formatarData(c.prazo)}
      </span>
    </li>
  )
}

function Pendente({ c, aoMudar, mostrarPessoa }: { c: CombinadoLinha & { pessoa?: string | null }; aoMudar: () => void; mostrarPessoa: boolean }) {
  const [descricao, setDescricao] = useState(c.descricao)
  const [prazo, setPrazo] = useState(c.prazo ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function mudar(status: 'aberto' | 'cancelado') {
    setSalvando(true)
    const { error } = await supabase
      .from('combinado')
      .update(status === 'aberto' ? { status, descricao: descricao.trim(), prazo: prazo || null } : { status })
      .eq('id', c.id)
    setSalvando(false)
    if (error) setErro(error.message)
    else aoMudar()
  }

  return (
    <li className="grid gap-2 rounded border border-dashed p-3 text-sm sm:grid-cols-[1fr_10rem_auto]">
      <div>
        <Badge variant="outline">Pendente de revisão</Badge>
        {mostrarPessoa && c.pessoa && <span className="ml-2 text-muted-foreground">{c.pessoa}</span>}
        <input aria-label="Descrição do combinado" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 block w-full rounded-md border bg-background px-2 py-1" />
        {c.evidencia_esperada && <p className="mt-1 text-xs text-muted-foreground">Evidência: {c.evidencia_esperada}</p>}
      </div>
      <label className="text-xs text-muted-foreground">
        Prazo
        <input type="date" aria-label="Prazo do combinado" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1 block w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground" />
      </label>
      <div className="flex items-end gap-2">
        <Button size="sm" onClick={() => mudar('aberto')} disabled={salvando || !descricao.trim() || !prazo}>
          Confirmar
        </Button>
        <Button size="sm" variant="outline" onClick={() => mudar('cancelado')} disabled={salvando}>
          Descartar
        </Button>
      </div>
      {erro && <p className="text-destructive sm:col-span-3">{erro}</p>}
    </li>
  )
}
