// M2 · Ficha do colaborador: contexto Boomit resumido + linha do tempo unificada.
// Leitura com o JWT do usuário; se a RLS não deixa ver, a ficha não aparece.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { lerContexto, lerSensivel, NIVEIS_IA, type ContextoColaborador } from '@/dominio/contexto'
import { montarLinhaDoTempo } from '@/dominio/linhaDoTempo'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { LinhaDoTempo, type MeuRegistro } from './ficha/LinhaDoTempo'

async function carregar(id: string, userId: string | null) {
  const pessoa = await supabase.from('colaborador').select('id, nome, cargo, area, nivel, contexto_colaborador(dados, atualizado_em, alertas_qualidade)').eq('id', id).maybeSingle()
  if (pessoa.error) throw new Error(pessoa.error.message)
  if (!pessoa.data) return null
  const [sensivel, linha, meus, acoes] = await Promise.all([
    supabase.from('contexto_colaborador_sensivel').select('dados').eq('colaborador_id', id).maybeSingle(),
    supabase.from('linha_do_tempo').select('quando, natureza, subtipo, resumo, origem_id').eq('colaborador_id', id),
    userId
      ? supabase.from('registro').select('id, tipo, texto, visibilidade').eq('colaborador_id', id).eq('autor_user_id', userId)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('acao_desenvolvimento').select('id, competencia, descricao, prazo, status, origem').eq('colaborador_id', id).order('prazo'),
  ])
  const contexto = lerContexto(pessoa.data.contexto_colaborador?.dados)
  return {
    pessoa: pessoa.data,
    atualizadoEm: pessoa.data.contexto_colaborador?.atualizado_em ?? null,
    contexto,
    sensivel: sensivel.data ? lerSensivel(sensivel.data.dados) : null,
    linhaDoTempo: montarLinhaDoTempo(exigir(linha), contexto),
    meusRegistros: (meus.data ?? []) as MeuRegistro[],
    acoes: acoes.data ?? [],
    alertas: pessoa.data.contexto_colaborador?.alertas_qualidade ?? [],
  }
}

const NIVEL: Record<string, string> = { operacional: 'Operacional', tatico: 'Tático', estrategico: 'Estratégico' }

export function FichaColaborador() {
  const { id = '' } = useParams()
  const { vinculo, sessao } = useSessao()
  const userId = sessao?.user.id ?? null
  const [recarga, setRecarga] = useState(0)
  const consulta = useConsulta(() => carregar(id, userId), [id, userId, recarga])

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← Voltar
      </Link>
      <Estado consulta={consulta}>
        {(dados) =>
          !dados ? (
            <p className="text-muted-foreground">Esta pessoa não está na sua visão.</p>
          ) : (
            <>
              <header>
                <h1 className="text-2xl font-semibold">{dados.pessoa.nome}</h1>
                <p className="text-muted-foreground">
                  {[dados.pessoa.cargo, dados.pessoa.area, dados.pessoa.nivel ? NIVEL[dados.pessoa.nivel] : null].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Contexto Boomit atualizado em {formatarData(dados.atualizadoEm)}</p>
                {dados.alertas.length > 0 && (
                  <p className="mt-2 rounded-md border bg-secondary px-3 py-1.5 text-xs">
                    Aviso de qualidade dos dados da Boomit: {dados.alertas.map((a) => a.replace(/^[a-z_]+:/, '').replaceAll('_', ' ')).join('; ')}. Confirme na conversa o que depender disso.
                  </p>
                )}
                {vinculo?.papel === 'lider' && (
                  <Button asChild size="sm" className="mt-3">
                    <Link to={`/preparar?pessoa=${dados.pessoa.id}`}>Preparar conversa</Link>
                  </Button>
                )}
                {vinculo?.papel === 'lider' && (
                  <Button asChild size="sm" variant="outline" className="mt-3 ml-2">
                    <Link to={`/registrar?pessoa=${dados.pessoa.id}`}>Registrar</Link>
                  </Button>
                )}
              </header>
              {dados.contexto ? <ResumoBoomit ctx={dados.contexto} /> : <p className="text-sm text-muted-foreground">Contexto Boomit indisponível para esta pessoa.</p>}
              {dados.sensivel && <Sensiveis s={dados.sensivel} />}
              {dados.acoes.length > 0 && (
                <Cartao titulo="Ações de desenvolvimento">
                  <ul className="space-y-2 text-sm">
                    {dados.acoes.map((a) => (
                      <li key={a.id} className="flex flex-wrap gap-x-3">
                        <span className="font-medium">{a.competencia ?? 'Desenvolvimento'}</span>
                        <span>{a.descricao}</span>
                        <span className="text-muted-foreground">
                          prazo {formatarData(a.prazo)} · {a.status.replace('_', ' ')} · {a.origem === 'boomit_pdi' ? 'ligada ao PDI Boomit' : a.origem === 'sistema_interno' ? 'sistema interno' : 'Copiloto'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Cartao>
              )}
              <LinhaDoTempo itens={dados.linhaDoTempo} meusRegistros={dados.meusRegistros} aoMudar={() => setRecarga((n) => n + 1)} />
            </>
          )
        }
      </Estado>
    </div>
  )
}

function ResumoBoomit({ ctx }: { ctx: ContextoColaborador }) {
  const nivelIa = ctx.ia?.nivel ?? null
  return (
    <>
      {ctx.secoes_indisponiveis.length > 0 && (
        <p className="rounded-md border bg-secondary px-3 py-2 text-sm">
          Indisponível na Boomit nesta leitura: {ctx.secoes_indisponiveis.join(', ').replaceAll('_', ' ')}.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Cartao titulo="Maiores gaps (meta × atual)">
          {ctx.gaps_prioritarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma competência abaixo da meta.</p>
          ) : (
            <ul className="space-y-3">
              {ctx.gaps_prioritarios.map((g) => (
                <li key={`${g.origem}:${g.competencia}`}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{g.competencia}</span>
                    <span className="text-muted-foreground">
                      atual {g.atual} · meta {g.meta}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-secondary" aria-hidden>
                    <div className="h-2 rounded bg-boomit-verde" style={{ width: `${Math.min(100, ((g.atual ?? 0) / (g.meta || 10)) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Fonte: Assessment Boomit (Digital de Crescimento e Táticas).</p>
        </Cartao>

        <Cartao titulo="Maturidade em IA e alinhamento">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Nível de IA (modelo Centauro)</dt>
              <dd className="font-medium">
                {nivelIa ? `N${nivelIa} · ${NIVEIS_IA[nivelIa]?.nome ?? ''}` : '—'}
                {ctx.ia?.score != null && <span className="font-normal text-muted-foreground"> · score {ctx.ia.score}/10</span>}
              </dd>
              {nivelIa && <dd className="text-muted-foreground">{NIVEIS_IA[nivelIa]?.descricao}</dd>}
            </div>
            <div>
              <dt className="text-muted-foreground">Alinhamento de propósito</dt>
              <dd className="font-medium">
                {ctx.alinhamento?.pct != null ? `${ctx.alinhamento.pct}%` : '—'} {ctx.alinhamento?.rotulo && <span className="font-normal">· {ctx.alinhamento.rotulo}</span>}
              </dd>
              {ctx.alinhamento && (
                <dd className="text-muted-foreground">
                  Cultural {ctx.alinhamento.cultural ?? '—'} · Performance {ctx.alinhamento.performance ?? '—'} · Engajamento {ctx.alinhamento.engajamento ?? '—'} · Estratégico{' '}
                  {ctx.alinhamento.estrategico ?? '—'}
                </dd>
              )}
            </div>
          </dl>
        </Cartao>

        <Cartao titulo="Parecer Focus">
          {ctx.focus ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Mentor: {ctx.focus.mentor ?? '—'}</p>
              {[...ctx.focus.analise_comportamental.map((a) => ({ ...a, tipo: 'Comportamental' })), ...ctx.focus.analise_tecnica.map((a) => ({ ...a, tipo: 'Técnica' }))].map((a) => (
                <details key={`${a.tipo}:${a.competencia}`} className="rounded border px-3 py-2">
                  <summary className="cursor-pointer font-medium">
                    {a.competencia} <span className="font-normal text-muted-foreground">· {a.tipo}</span>
                  </summary>
                  <p className="mt-2">{a.texto}</p>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem parecer Focus.</p>
          )}
        </Cartao>

        <Cartao titulo="PDI Boomit">
          {ctx.pdi_boomit ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">Gerado em {formatarData(ctx.pdi_boomit.gerado_em)}</p>
              {ctx.pdi_boomit.pontos_chave.map((p) => (
                <div key={p.titulo} className="rounded border px-3 py-2">
                  <p className="font-medium">{p.titulo}</p>
                  {p.desafio && <p>{p.desafio}</p>}
                  {p.kpi && (
                    <p className="text-muted-foreground">
                      KPI: {p.kpi} · {p.de} → {p.para} · {p.prazo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem PDI Boomit.</p>
          )}
        </Cartao>

        <Cartao titulo="Personalidade (16P)" className="md:col-span-2">
          {ctx.personalidade ? (
            <p className="text-sm">
              <span className="font-medium">{ctx.personalidade.tipo}</span>
              {ctx.personalidade.apelido && <span> · {ctx.personalidade.apelido}</span>}
              <span className="text-muted-foreground"> · {formatarData(ctx.personalidade.data)}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Teste não disponível.</p>
          )}
          <p className="mt-2 rounded bg-boomit-neutro-quente px-3 py-2 text-xs">
            Referência, não rótulo: ajuda a preparar a abordagem. Não explica comportamento nem justifica decisão sobre a pessoa.
          </p>
        </Cartao>
      </div>
    </>
  )
}

function Sensiveis({ s }: { s: NonNullable<ReturnType<typeof lerSensivel>> }) {
  return (
    <Cartao titulo="Indicadores sensíveis · acesso restrito">
      <p className="text-sm">
        PPL {s.ppl ?? '—'} · Performance técnica {s.performance_tecnica_pct != null ? `${s.performance_tecnica_pct}%` : '—'} · Quadrante {s.quadrante_matriz ?? '—'}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Visíveis para o admin e, só se a empresa autorizar, para a liderança. Referência da Boomit, não decisão: o Copiloto não usa estes
        números para recomendar promover, realocar ou desligar.
      </p>
    </Cartao>
  )
}
