// M1 · Minha equipe (home do líder e do mentor). Tudo pelo JWT do usuário: a RLS decide quem aparece.
// Sprint 2: filtros (área, nível, maturidade em IA, busca), ordenação por próxima ação, estados vazios.
import { useState } from 'react'
import { Link } from 'react-router'
import type { Vinculo } from '@/auth/sessao'
import { Cartao, Estado, Numero } from '@/components/Estado'
import { estaVencido, hojeSaoPaulo, type StatusCombinado } from '@/dominio/combinados'
import { lerContexto, NIVEIS_IA } from '@/dominio/contexto'
import { FILTROS_VAZIOS, filtrarEquipe, type FiltrosEquipe, type Ordem, opcoesDeFiltro, ordenarEquipe, type PessoaEquipe } from '@/dominio/equipe'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { InsightsDaSemana } from './comunicacao/InsightsDaSemana'
import { PainelLideranca } from './PainelLideranca'

const NIVEL: Record<string, string> = { operacional: 'Operacional', tatico: 'Tático', estrategico: 'Estratégico' }

async function carregarEquipe(v: Vinculo): Promise<{ pessoas: PessoaEquipe[]; combinadosAbertos: number; situacoesAbertas: number }> {
  let ids: string[] | null = null
  if (v.papel === 'lider' && v.colaborador_id) {
    // Liderados diretos ativos.
    const vinculos = exigir(await supabase.from('vinculo_lideranca').select('liderado_id').eq('lider_id', v.colaborador_id).is('fim', null))
    ids = vinculos.map((x) => x.liderado_id)
  }
  let consulta = supabase.from('colaborador').select('id, nome, cargo, area, nivel, contexto_colaborador(dados)').eq('ativo', true).order('nome')
  if (ids) consulta = consulta.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  else if (v.colaborador_id) consulta = consulta.neq('id', v.colaborador_id)
  const linhas = exigir(await consulta)

  const [combinados, situacoes] = await Promise.all([
    supabase.from('combinado').select('colaborador_id, prazo, status').in('status', ['aberto', 'renegociado']),
    supabase.from('situacao').select('id', { count: 'exact', head: true }).in('status', ['rascunho', 'preparada', 'simulada']),
  ])
  const hoje = hojeSaoPaulo()
  const porPessoa = new Map<string, { prazo: string | null; vencidos: number }>()
  for (const c of combinados.data ?? []) {
    if (!c.colaborador_id) continue
    const atual = porPessoa.get(c.colaborador_id) ?? { prazo: null, vencidos: 0 }
    if (estaVencido({ status: c.status as StatusCombinado, prazo: c.prazo }, hoje)) atual.vencidos++
    if (c.prazo && (!atual.prazo || c.prazo < atual.prazo)) atual.prazo = c.prazo
    porPessoa.set(c.colaborador_id, atual)
  }

  return {
    pessoas: linhas.map((l) => ({
      id: l.id,
      nome: l.nome,
      cargo: l.cargo,
      area: l.area,
      nivel: l.nivel,
      contexto: lerContexto(l.contexto_colaborador?.dados),
      proximoPrazo: porPessoa.get(l.id)?.prazo ?? null,
      combinadosVencidos: porPessoa.get(l.id)?.vencidos ?? 0,
    })),
    combinadosAbertos: combinados.data?.length ?? 0,
    situacoesAbertas: situacoes.count ?? 0,
  }
}

export function MinhaEquipe({ vinculo, nome }: { vinculo: Vinculo; nome: string }) {
  const consulta = useConsulta(() => carregarEquipe(vinculo), [vinculo.empresa_id, vinculo.colaborador_id, vinculo.papel])
  const [filtros, setFiltros] = useState<FiltrosEquipe>(FILTROS_VAZIOS)
  const [ordem, setOrdem] = useState<Ordem>('proxima_acao')
  const primeiroNome = nome.split(' ')[0]
  const titulo = vinculo.papel === 'mentor' ? 'Líder mentorado e equipe' : 'Minha equipe'

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Olá, {primeiroNome}</p>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
      </header>

      <Estado consulta={consulta}>
        {({ pessoas, combinadosAbertos, situacoesAbertas }) => {
          const visiveis = ordenarEquipe(filtrarEquipe(pessoas, filtros), ordem)
          const opcoes = opcoesDeFiltro(pessoas)
          const filtrando = filtros !== FILTROS_VAZIOS
          return (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Numero rotulo="Pessoas" valor={pessoas.length} detalhe={vinculo.papel === 'lider' ? 'Liderados diretos' : undefined} />
                <Numero rotulo="Combinados abertos" valor={combinadosAbertos} />
                <Numero rotulo="Preparações em andamento" valor={situacoesAbertas} />
              </div>

              {vinculo.papel === 'lider' && (
                <Link to="/preparar" className="rounded-lg border bg-card p-5 transition-colors hover:border-primary">
                  <p className="font-semibold">O que você precisa preparar hoje?</p>
                  <p className="mt-1 text-sm text-muted-foreground">Feedback, PDI, conversa difícil, decisão na alçada ou 1:1, com o contexto da Boomit.</p>
                </Link>
              )}

              {vinculo.papel === 'lider' && <InsightsDaSemana resumido />}

              {vinculo.papel === 'lider' && <PainelLideranca empresaId={vinculo.empresa_id} />}

              <Cartao titulo={`${titulo} · ${visiveis.length}${visiveis.length !== pessoas.length ? ` de ${pessoas.length}` : ''}`}>
                {pessoas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma pessoa vinculada a você ainda. O RH cadastra a hierarquia; fale com ele se faltar alguém.</p>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Buscar</span>
                        <input
                          type="search"
                          value={filtros.busca}
                          onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                          placeholder="Nome ou cargo"
                          className="rounded-md border bg-background px-2 py-1.5"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Área</span>
                        <select value={filtros.area ?? ''} onChange={(e) => setFiltros({ ...filtros, area: e.target.value || null })} className="rounded-md border bg-background px-2 py-1.5">
                          <option value="">Todas</option>
                          {opcoes.areas.map((a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Nível</span>
                        <select value={filtros.nivel ?? ''} onChange={(e) => setFiltros({ ...filtros, nivel: e.target.value || null })} className="rounded-md border bg-background px-2 py-1.5">
                          <option value="">Todos</option>
                          {opcoes.niveis.map((n) => (
                            <option key={n} value={n}>
                              {NIVEL[n] ?? n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <fieldset className="flex flex-col gap-1">
                        <legend className="text-xs text-muted-foreground">Maturidade em IA</legend>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const ativo = filtros.niveisIa.includes(n)
                            return (
                              <button
                                key={n}
                                type="button"
                                aria-pressed={ativo}
                                title={NIVEIS_IA[n]?.nome}
                                onClick={() => setFiltros({ ...filtros, niveisIa: ativo ? filtros.niveisIa.filter((x) => x !== n) : [...filtros.niveisIa, n] })}
                                className={cn('rounded-md border px-2 py-1', ativo && 'border-primary bg-primary text-primary-foreground')}
                              >
                                N{n}
                              </button>
                            )
                          })}
                        </div>
                      </fieldset>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">Ordenar por</span>
                        <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="rounded-md border bg-background px-2 py-1.5">
                          <option value="proxima_acao">Próxima ação</option>
                          <option value="maior_gap">Maior gap</option>
                          <option value="nome">Nome</option>
                        </select>
                      </label>
                      {filtrando && (
                        <button type="button" onClick={() => setFiltros(FILTROS_VAZIOS)} className="pb-1.5 text-xs underline">
                          Limpar filtros
                        </button>
                      )}
                    </div>
                    {visiveis.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Ninguém da equipe corresponde a esses filtros.</p>
                    ) : (
                      <ul className="divide-y">
                        {visiveis.map((p) => (
                          <LinhaPessoa key={p.id} pessoa={p} />
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </Cartao>
            </>
          )
        }}
      </Estado>
    </div>
  )
}

function LinhaPessoa({ pessoa }: { pessoa: PessoaEquipe }) {
  const ctx = pessoa.contexto
  const nivelIa = ctx?.ia?.nivel
  const maiorGap = ctx?.gaps_prioritarios[0]
  return (
    <li>
      <Link to={`/pessoas/${pessoa.id}`} className="grid gap-1 py-3 hover:bg-secondary/60 sm:grid-cols-[1.4fr_0.9fr_0.8fr_1.2fr_1fr] sm:items-center sm:gap-4 sm:px-2">
        <span>
          <span className="block font-medium">{pessoa.nome}</span>
          <span className="block text-sm text-muted-foreground">{[pessoa.cargo, pessoa.area].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">IA: </span>
          {nivelIa ? `N${nivelIa} · ${NIVEIS_IA[nivelIa]?.nome ?? ''}` : '—'}
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">Alinh.: </span>
          {ctx?.alinhamento?.pct != null ? `${ctx.alinhamento.pct}%` : '—'}
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">Maior gap: </span>
          {maiorGap ? `${maiorGap.competencia} (${maiorGap.gap})` : '—'}
        </span>
        <span className={cn('text-sm', pessoa.combinadosVencidos > 0 && 'font-semibold text-destructive')}>
          {pessoa.combinadosVencidos > 0
            ? `${pessoa.combinadosVencidos} combinado(s) vencido(s)`
            : pessoa.proximoPrazo
              ? `Próximo prazo ${formatarData(pessoa.proximoPrazo)}`
              : <span className="text-muted-foreground">Sem combinados</span>}
        </span>
      </Link>
    </li>
  )
}
