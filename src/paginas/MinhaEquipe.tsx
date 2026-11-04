// M1 · Minha equipe (home do líder e do mentor). Tudo pelo JWT do usuário: a RLS decide quem aparece.
import { Link } from 'react-router'
import type { Vinculo } from '@/auth/sessao'
import { Cartao, Estado, Numero } from '@/components/Estado'
import { lerContexto, NIVEIS_IA, type ContextoColaborador } from '@/dominio/contexto'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'

interface Pessoa {
  id: string
  nome: string
  cargo: string | null
  area: string | null
  contexto: ContextoColaborador | null
}

async function carregarEquipe(v: Vinculo): Promise<{ pessoas: Pessoa[]; combinadosAbertos: number; situacoesAbertas: number }> {
  let ids: string[] | null = null
  if (v.papel === 'lider' && v.colaborador_id) {
    // Liderados diretos ativos.
    const vinculos = exigir(await supabase.from('vinculo_lideranca').select('liderado_id').eq('lider_id', v.colaborador_id).is('fim', null))
    ids = vinculos.map((x) => x.liderado_id)
  }
  let consulta = supabase.from('colaborador').select('id, nome, cargo, area, contexto_colaborador(dados)').eq('ativo', true).order('nome')
  if (ids) consulta = consulta.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  else if (v.colaborador_id) consulta = consulta.neq('id', v.colaborador_id)
  const linhas = exigir(await consulta)

  const [combinados, situacoes] = await Promise.all([
    supabase.from('combinado').select('id', { count: 'exact', head: true }).eq('status', 'aberto'),
    supabase.from('situacao').select('id', { count: 'exact', head: true }).in('status', ['rascunho', 'preparada', 'simulada']),
  ])

  return {
    pessoas: linhas.map((l) => ({ id: l.id, nome: l.nome, cargo: l.cargo, area: l.area, contexto: lerContexto(l.contexto_colaborador?.dados) })),
    combinadosAbertos: combinados.count ?? 0,
    situacoesAbertas: situacoes.count ?? 0,
  }
}

export function MinhaEquipe({ vinculo, nome }: { vinculo: Vinculo; nome: string }) {
  const consulta = useConsulta(() => carregarEquipe(vinculo), [vinculo.empresa_id, vinculo.colaborador_id, vinculo.papel])
  const primeiroNome = nome.split(' ')[0]
  const titulo = vinculo.papel === 'mentor' ? 'Líder mentorado e equipe' : 'Minha equipe'

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Olá, {primeiroNome}</p>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
      </header>

      <Estado consulta={consulta}>
        {({ pessoas, combinadosAbertos, situacoesAbertas }) => (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Numero rotulo="Pessoas" valor={pessoas.length} detalhe={vinculo.papel === 'lider' ? 'Liderados diretos' : undefined} />
              <Numero rotulo="Combinados abertos" valor={combinadosAbertos} />
              <Numero rotulo="Preparações em andamento" valor={situacoesAbertas} />
            </div>

            <section className="rounded-lg border border-dashed bg-card p-5">
              <p className="font-semibold">O que você precisa preparar hoje?</p>
              <p className="mt-1 text-sm text-muted-foreground">Preparar feedback e simular a conversa chegam no próximo checkpoint.</p>
            </section>

            <Cartao titulo={`${titulo} · ${pessoas.length}`}>
              {pessoas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma pessoa vinculada a você ainda.</p>
              ) : (
                <ul className="divide-y">
                  {pessoas.map((p) => (
                    <LinhaPessoa key={p.id} pessoa={p} />
                  ))}
                </ul>
              )}
            </Cartao>
          </>
        )}
      </Estado>
    </div>
  )
}

function LinhaPessoa({ pessoa }: { pessoa: Pessoa }) {
  const ctx = pessoa.contexto
  const nivelIa = ctx?.ia?.nivel
  const maiorGap = ctx?.gaps_prioritarios[0]
  return (
    <li>
      <Link to={`/pessoas/${pessoa.id}`} className="grid gap-1 py-3 hover:bg-secondary/60 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr] sm:items-center sm:gap-4 sm:px-2">
        <span>
          <span className="block font-medium">{pessoa.nome}</span>
          <span className="block text-sm text-muted-foreground">{[pessoa.cargo, pessoa.area].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">IA: </span>
          {nivelIa ? `N${nivelIa} · ${NIVEIS_IA[nivelIa]?.nome ?? ''}` : '—'}
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">Alinhamento: </span>
          {ctx?.alinhamento?.pct != null ? `${ctx.alinhamento.pct}%` : '—'}
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">Maior gap: </span>
          {maiorGap ? `${maiorGap.competencia} (${maiorGap.gap})` : '—'}
        </span>
      </Link>
    </li>
  )
}
