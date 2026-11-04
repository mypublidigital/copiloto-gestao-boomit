// Lista de combinados (M7). Pendentes: confirmar ou descartar (regra 5). Abertos (Sprint 6):
// cumprido com evidência, renegociar com novo prazo e motivo, não cumprido ou cancelar.
// O histórico de cada mudança é gravado pelo banco (trigger combinado_historico).
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { estaVencido, hojeSaoPaulo, ROTULO_STATUS_COMBINADO, type StatusCombinado } from '@/dominio/combinados'
import { ROTULO_RESPONSAVEL } from '@/dominio/preparacao'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Json } from '@/tipos/banco'

export const CAMPOS_COMBINADO = 'id, descricao, responsavel_tipo, prazo, status, evidencia_esperada, evidencia_registrada, historico'

export interface CombinadoLinha {
  id: string
  descricao: string
  responsavel_tipo: string
  prazo: string | null
  status: StatusCombinado
  evidencia_esperada: string | null
  evidencia_registrada?: string | null
  historico?: Json
  pessoa?: string | null
}

interface EventoHistorico {
  em: string
  status_de?: StatusCombinado
  status_para?: StatusCombinado
  prazo_de?: string
  prazo_para?: string
  nota?: string
}

export function ListaCombinados({ lista, aoMudar, mostrarPessoa = false }: { lista: CombinadoLinha[]; aoMudar: () => void; mostrarPessoa?: boolean }) {
  if (lista.length === 0) return <p className="text-sm text-muted-foreground">Nenhum combinado.</p>
  return (
    <ul className="space-y-2">
      {lista.map((c) => (c.status === 'pendente_revisao' ? <Pendente key={c.id} c={c} aoMudar={aoMudar} mostrarPessoa={mostrarPessoa} /> : <Confirmado key={c.id} c={c} aoMudar={aoMudar} mostrarPessoa={mostrarPessoa} />))}
    </ul>
  )
}

type Acao = 'cumprido' | 'renegociar' | 'nao_cumprido' | 'cancelado' | null

function Confirmado({ c, aoMudar, mostrarPessoa }: { c: CombinadoLinha; aoMudar: () => void; mostrarPessoa: boolean }) {
  const [acao, setAcao] = useState<Acao>(null)
  const [nota, setNota] = useState('')
  const [novoPrazo, setNovoPrazo] = useState(c.prazo ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const vencido = estaVencido(c)
  const ativo = c.status === 'aberto' || c.status === 'renegociado'
  const historico = (Array.isArray(c.historico) ? c.historico : []) as unknown as EventoHistorico[]

  async function aplicar() {
    if (!acao) return
    setSalvando(true)
    setErro(null)
    const hoje = hojeSaoPaulo()
    const mudanca =
      acao === 'cumprido'
        ? { status: 'cumprido' as const, concluido_em: hoje, evidencia_registrada: nota.trim() || null, nota_mudanca: nota.trim() || null }
        : acao === 'renegociar'
          ? { status: 'renegociado' as const, prazo: novoPrazo, nota_mudanca: nota.trim() }
          : { status: acao, concluido_em: hoje, nota_mudanca: nota.trim() || null }
    const { error } = await supabase.from('combinado').update(mudanca).eq('id', c.id)
    setSalvando(false)
    if (error) setErro(error.message)
    else {
      setAcao(null)
      setNota('')
      aoMudar()
    }
  }

  const precisaNota = acao === 'renegociar'
  return (
    <li className="rounded border p-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Badge className={vencido ? 'bg-destructive text-white' : ativo ? 'bg-boomit-verde text-boomit-claro' : 'bg-secondary text-boomit-preto'}>
          {vencido ? 'Vencido' : ROTULO_STATUS_COMBINADO[c.status]}
        </Badge>
        <span className="font-medium">{c.descricao}</span>
        <span className="text-muted-foreground">
          {mostrarPessoa && c.pessoa ? `${c.pessoa} · ` : ''}
          {ROTULO_RESPONSAVEL[c.responsavel_tipo as keyof typeof ROTULO_RESPONSAVEL] ?? c.responsavel_tipo} · prazo {formatarData(c.prazo)}
        </span>
      </div>
      {c.evidencia_registrada && <p className="mt-1 text-xs text-muted-foreground">Evidência: {c.evidencia_registrada}</p>}

      {ativo && !acao && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAcao('cumprido')}>
            Cumprido
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAcao('renegociar')}>
            Renegociar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAcao('nao_cumprido')}>
            Não cumprido
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAcao('cancelado')}>
            Cancelar
          </Button>
        </div>
      )}
      {acao && (
        <div className="mt-2 grid gap-2 rounded bg-secondary p-2 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            {acao === 'renegociar' && (
              <label className="text-xs">
                Novo prazo
                <input type="date" aria-label="Novo prazo" min={hojeSaoPaulo()} value={novoPrazo} onChange={(e) => setNovoPrazo(e.target.value)} className="ml-2 rounded-md border bg-background px-2 py-1" />
              </label>
            )}
            <input
              aria-label="Nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={acao === 'cumprido' ? 'Evidência (o que mostra que foi cumprido)' : acao === 'renegociar' ? 'Motivo da renegociação (obrigatório)' : 'Observação (opcional)'}
              className="rounded-md border bg-background px-2 py-1"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={aplicar} disabled={salvando || (precisaNota && (!nota.trim() || !novoPrazo))}>
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAcao(null)}>
              Voltar
            </Button>
          </div>
        </div>
      )}
      {historico.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground">Histórico ({historico.length})</summary>
          <ol className="mt-1 space-y-1">
            {historico.map((h, i) => (
              <li key={i} className={cn('border-l-2 pl-2', h.status_para === 'renegociado' && 'border-boomit-taupe')}>
                {formatarData(h.em)}: {h.status_de && h.status_para && h.status_de !== h.status_para ? `${ROTULO_STATUS_COMBINADO[h.status_de]} → ${ROTULO_STATUS_COMBINADO[h.status_para]}` : 'prazo alterado'}
                {h.prazo_de !== h.prazo_para && h.prazo_para ? ` · prazo ${formatarData(h.prazo_de)} → ${formatarData(h.prazo_para)}` : ''}
                {h.nota ? ` · ${h.nota}` : ''}
              </li>
            ))}
          </ol>
        </details>
      )}
      {erro && <p className="mt-1 text-xs text-destructive">{erro}</p>}
    </li>
  )
}

function Pendente({ c, aoMudar, mostrarPessoa }: { c: CombinadoLinha; aoMudar: () => void; mostrarPessoa: boolean }) {
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
