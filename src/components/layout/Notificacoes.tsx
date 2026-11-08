// Central de notificações (Sprint 6): lembretes já enviados pelo agendador (combinados e, desde
// 08/11/2026, compromissos da agenda e decisões)
// (pg_cron, a cada 15 minutos) e ainda não lidos. A RLS mostra só os lembretes do usuário.
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { estaVencido, type StatusCombinado } from '@/dominio/combinados'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Lembrete {
  id: string
  enviado_em: string | null
  etapa: string
  combinado: { descricao: string; prazo: string | null; status: StatusCombinado; colaborador: { nome: string } | null } | null
  compromisso: { id: string; titulo: string; inicio: string } | null
  decisao: { id: string; titulo: string } | null
}

const TITULO_ETAPA: Record<string, string> = {
  vespera: 'Amanhã',
  em_breve: 'Em 1 hora',
  pos_evento: 'Registre como foi',
  decisao_prazo: 'Prazo de decisão amanhã',
  decisao_revisao: 'Revisar decisão',
}

export function Notificacoes() {
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [aberto, setAberto] = useState(false)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let ativo = true
    supabase
      .from('lembrete')
      .select('id, enviado_em, etapa, combinado:combinado_id(descricao, prazo, status, colaborador:colaborador_id(nome)), compromisso:compromisso_id(id, titulo, inicio), decisao:decisao_id(id, titulo)')
      .eq('canal', 'inapp')
      .not('enviado_em', 'is', null)
      .is('lido_em', null)
      .order('enviado_em', { ascending: false })
      .limit(20)
      .then(({ data }) => ativo && setLembretes((data ?? []) as unknown as Lembrete[]))
    const t = setTimeout(() => setRecarga((n) => n + 1), 60_000)
    return () => {
      ativo = false
      clearTimeout(t)
    }
  }, [recarga])

  async function marcarLidos(ids: string[]) {
    await supabase.from('lembrete').update({ lido_em: new Date().toISOString() }).in('id', ids)
    setRecarga((n) => n + 1)
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Lembretes${lembretes.length ? `: ${lembretes.length} novo(s)` : ''}`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="relative rounded-md p-1.5 hover:bg-secondary"
      >
        <Bell className="size-5" aria-hidden />
        {lembretes.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold text-white">{lembretes.length}</span>
        )}
      </button>
      {aberto && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Lembretes</p>
            {lembretes.length > 0 && (
              <button type="button" className="text-xs underline" onClick={() => marcarLidos(lembretes.map((l) => l.id))}>
                Marcar todos como lidos
              </button>
            )}
          </div>
          {lembretes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lembrete novo.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {lembretes.map((l) => {
                if (l.compromisso || l.decisao) {
                  const alvo = l.compromisso ? { titulo: l.compromisso.titulo, link: `/agenda?compromisso=${l.compromisso.id}`, quando: new Date(l.compromisso.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } : { titulo: l.decisao!.titulo, link: `/decisoes/${l.decisao!.id}`, quando: '' }
                  return (
                    <li key={l.id} className="rounded border p-2 text-sm">
                      <p className="text-xs font-semibold text-boomit-verde">{TITULO_ETAPA[l.etapa] ?? 'Lembrete'}</p>
                      <p>{alvo.titulo}</p>
                      {alvo.quando && <p className="text-xs text-muted-foreground">{alvo.quando}</p>}
                      <div className="mt-1 flex gap-3 text-xs">
                        <Link to={alvo.link} className="underline" onClick={() => setAberto(false)}>Abrir</Link>
                        <button type="button" className="underline" onClick={() => marcarLidos([l.id])}>Marcar como lido</button>
                      </div>
                    </li>
                  )
                }
                const c = l.combinado
                const vencido = c ? estaVencido(c) : false
                return (
                  <li key={l.id} className="rounded border p-2 text-sm">
                    <p className={cn('text-xs font-semibold', vencido ? 'text-destructive' : 'text-boomit-verde')}>{vencido ? 'Prazo vencido' : 'Prazo chegando'}</p>
                    <p>{c?.descricao ?? 'Combinado'}</p>
                    <p className="text-xs text-muted-foreground">
                      {c?.colaborador?.nome ? `${c.colaborador.nome} · ` : ''}prazo {formatarData(c?.prazo)}
                    </p>
                    <div className="mt-1 flex gap-3 text-xs">
                      <Link to="/combinados" className="underline" onClick={() => setAberto(false)}>
                        Ver combinados
                      </Link>
                      <button type="button" className="underline" onClick={() => marcarLidos([l.id])}>
                        Marcar como lido
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
