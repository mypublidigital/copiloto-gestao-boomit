// As seis frentes de gestão. Cada uma junta o que o líder já tem (contexto Boomit, registros,
// combinados, agenda, decisões) e leva às ações do Copiloto. Nada aqui avalia a pessoa:
// indicadores Boomit são referência, não rótulo (regra 3).
import { Link } from 'react-router'
import { Cartao, Numero } from '@/components/Estado'
import { hojeSaoPaulo } from '@/dominio/combinados'
import { NIVEIS_IA } from '@/dominio/contexto'
import { cadenciaDeUmAUm, contarPor, diasDesde, distribuicaoIA, maisRecentePorPessoa, media, ROTULO_REGISTRO, ROTULO_STATUS_ACAO, taxaDeCumprimento } from '@/dominio/frentes'
import { formatarData } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { InsightsDaSemana } from '../comunicacao/InsightsDaSemana'
import { Atalhos, Barra, Cabecalho, ListaSituacoes, Vazio } from './comum'
import type { DadosFrentes } from './dados'

type P = { d: DadosFrentes; agora: number }
const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('pt-BR'))
const nomesDe = (d: DadosFrentes) => new Map(d.pessoas.map((p) => [p.id, p.nome]))
const dentroDe = (iso: string | null, dias: number, agora: number) => {
  const x = diasDesde(iso, agora)
  return x !== null && x >= 0 && x <= dias
}

// ---------------------------------------------------------------- Desempenho
export function Desempenho({ d, agora }: P) {
  const hoje = hojeSaoPaulo()
  const nomes = nomesDe(d)
  const abertos = d.combinados.filter((c) => c.status === 'aberto' || c.status === 'renegociado')
  const vencidos = abertos.filter((c) => c.prazo && c.prazo < hoje)
  const feedbacks = d.registros.filter((r) => r.tipo === 'feedback' || r.tipo === 'reconhecimento')
  const ultimoFeedback = maisRecentePorPessoa(feedbacks, (r) => r.data_fato)
  const proxima = new Map<string, string>()
  for (const c of [...d.compromissos].reverse()) if (c.status === 'agendado' && c.colaborador_id && Date.parse(c.inicio) >= agora && !proxima.has(c.colaborador_id)) proxima.set(c.colaborador_id, c.inicio)
  return (
    <>
      <Cabecalho titulo="Desempenho" descricao="Entregas, combinados e feedbacks da equipe. O ritmo de feedback e o cumprimento dos combinados mostram onde agir primeiro." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Combinados abertos" valor={abertos.length} />
        <Numero rotulo="Vencidos" valor={vencidos.length} detalhe={vencidos.length ? 'Registre ou renegocie' : 'Nada vencido'} />
        <Numero rotulo="Cumprimento" valor={taxaDeCumprimento(d.combinados) === null ? '—' : `${taxaDeCumprimento(d.combinados)}%`} detalhe="Dos combinados encerrados" />
        <Numero rotulo="Feedbacks em 30 dias" valor={feedbacks.filter((r) => dentroDe(r.data_fato, 30, agora)).length} />
      </div>
      <Atalhos itens={[
        { to: '/preparar?tipo=feedback', titulo: 'Preparar um feedback', texto: 'Fatos com fonte, perguntas e combinados propostos.' },
        { to: '/combinados', titulo: 'Acompanhar combinados', texto: 'Cumprido, renegociado ou não cumprido, com histórico.' },
        { to: '/registrar', titulo: 'Registrar um feedback rápido', texto: 'Algo que aconteceu hoje, em um minuto.' },
      ]} />
      <Cartao titulo="Acompanhamento por pessoa">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="pb-2">Pessoa</th><th>Performance (Boomit)</th><th>Combinados</th><th>Último feedback</th><th>Próxima conversa</th><th /></tr>
            </thead>
            <tbody className="divide-y">
              {d.pessoas.map((p) => {
                const seus = abertos.filter((c) => c.colaborador_id === p.id)
                const venc = seus.filter((c) => c.prazo && c.prazo < hoje).length
                const ult = ultimoFeedback.get(p.id)
                const dias = diasDesde(ult ?? null, agora)
                return (
                  <tr key={p.id}>
                    <td className="py-2"><Link to={`/pessoas/${p.id}`} className="font-medium hover:underline">{p.nome}</Link><span className="block text-xs text-muted-foreground">{p.cargo}</span></td>
                    <td><Barra valor={p.contexto?.alinhamento?.performance ?? null} /></td>
                    <td>{seus.length}{venc > 0 && <span className="ml-1 text-xs font-semibold text-destructive">({venc} vencido{venc > 1 ? 's' : ''})</span>}</td>
                    <td className={cn(dias !== null && dias > 30 && 'text-amber-700')}>{ult ? `${formatarData(ult)}${dias !== null ? ` · há ${dias} d` : ''}` : <span className="text-muted-foreground">Nenhum registrado</span>}</td>
                    <td>{proxima.get(p.id) ? formatarData(proxima.get(p.id)) : <Link to="/agenda" className="text-xs underline">Agendar</Link>}</td>
                    <td><Link to={`/preparar?pessoa=${p.id}&tipo=feedback`} className="text-xs underline">Preparar feedback</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Performance é o índice de alinhamento da Plataforma Boomit: referência para a conversa, nunca nota da pessoa.</p>
      </Cartao>
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Combinados vencidos">
          {vencidos.length ? (
            <ul className="space-y-1 text-sm">{vencidos.map((c) => <li key={c.id}>{c.descricao} <span className="text-xs text-destructive">· {c.colaborador_id ? nomes.get(c.colaborador_id) : 'Equipe'} · {formatarData(c.prazo)}</span></li>)}</ul>
          ) : <Vazio>Nenhum combinado vencido.</Vazio>}
        </Cartao>
        <Cartao titulo="Conversas de desempenho">
          <ListaSituacoes situacoes={d.situacoes.filter((s) => s.frente === 'desempenho')} nomes={nomes} />
        </Cartao>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Desenvolvimento
export function Desenvolvimento({ d }: P) {
  const nomes = nomesDe(d)
  const ia = distribuicaoIA(d.pessoas.map((p) => p.contexto?.ia?.nivel))
  const comPdi = d.pessoas.filter((p) => (p.contexto?.pdi_boomit?.pontos_chave.length ?? 0) > 0)
  const devolutivas = d.pessoas.filter((p) => p.contexto?.devolutiva && !p.contexto.devolutiva.concluida)
  const andamento = d.acoes.filter((a) => a.status === 'planejada' || a.status === 'em_andamento')
  const maxIA = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => ia[n as 1]))
  return (
    <>
      <Cabecalho titulo="Desenvolvimento" descricao={`PDI, competências e maturidade em IA da equipe. O PDI segue o modo "${d.modoPdi === 'boomit' ? 'PDI Boomit' : d.modoPdi}" definido pela empresa: o Copiloto apoia as conversas, não cria ciclo avaliativo.`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Com PDI Boomit" valor={`${comPdi.length} de ${d.pessoas.length}`} />
        <Numero rotulo="Ações em andamento" valor={andamento.length} detalhe={`${d.acoes.filter((a) => a.status === 'concluida').length} concluídas`} />
        <Numero rotulo="Devolutivas pendentes" valor={devolutivas.length} />
        <Numero rotulo="Maturidade em IA (média)" valor={num(media(d.pessoas.map((p) => p.contexto?.ia?.nivel)))} detalhe="Escala de 1 a 5" />
      </div>
      <Atalhos itens={[
        { to: '/preparar?tipo=pdi', titulo: 'Preparar conversa de PDI', texto: 'Ações de desenvolvimento ligadas aos gaps, com fonte.' },
        { to: '/agenda', titulo: 'Agendar conversa de PDI', texto: 'Lembretes na véspera e pedido de registro depois.' },
        { to: '/registrar', titulo: 'Registrar avanço', texto: 'Reconhecimento ou observação de prática.' },
      ]} />
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Cartao titulo="Gaps prioritários e PDI por pessoa">
          <ul className="divide-y text-sm">
            {d.pessoas.map((p) => {
              const gaps = p.contexto?.gaps_prioritarios.slice(0, 2) ?? []
              const pontos = p.contexto?.pdi_boomit?.pontos_chave ?? []
              const acoes = d.acoes.filter((a) => a.colaborador_id === p.id)
              return (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <Link to={`/pessoas/${p.id}`} className="font-medium hover:underline">{p.nome}</Link>
                    <span className="block text-xs text-muted-foreground">
                      {gaps.length ? gaps.map((g) => `${g.competencia} (${g.atual ?? '—'} → ${g.meta ?? '—'})`).join(' · ') : 'Sem gaps registrados'}
                    </span>
                    <span className="block text-xs text-muted-foreground">{pontos.length ? `PDI Boomit: ${pontos.map((x) => x.titulo).join(', ')}` : 'Sem PDI Boomit'}{acoes.length ? ` · ${acoes.length} ação(ões) no Copiloto` : ''}</span>
                  </span>
                  <Link to={`/preparar?pessoa=${p.id}&tipo=pdi`} className="shrink-0 text-xs underline">Preparar PDI</Link>
                </li>
              )
            })}
          </ul>
        </Cartao>
        <Cartao titulo="Maturidade em IA da equipe">
          <ul className="space-y-2 text-sm">
            {[1, 2, 3, 4, 5].map((n) => (
              <li key={n}>
                <div className="flex justify-between text-xs"><span>N{n} · {NIVEIS_IA[n]!.nome}</span><span>{ia[n as 1]}</span></div>
                <div className="h-1.5 rounded bg-secondary"><div className="h-1.5 rounded bg-boomit-verde" style={{ width: `${(ia[n as 1] / maxIA) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Modelo Centauro (Boomit). Use para combinar apoio, não para comparar pessoas.</p>
        </Cartao>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Ações de desenvolvimento">
          {d.acoes.length ? (
            <ul className="space-y-2 text-sm">
              {d.acoes.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span>{a.descricao}<span className="block text-xs text-muted-foreground">{nomes.get(a.colaborador_id) ?? ''}{a.competencia ? ` · ${a.competencia}` : ''}{a.prazo ? ` · até ${formatarData(a.prazo)}` : ''}</span></span>
                  <span className={cn('h-fit shrink-0 rounded-full px-2 py-0.5 text-xs', a.status === 'concluida' ? 'bg-boomit-verde text-white' : 'bg-secondary')}>{ROTULO_STATUS_ACAO[a.status] ?? a.status}</span>
                </li>
              ))}
            </ul>
          ) : <Vazio>Nenhuma ação ainda. Elas nascem das conversas de PDI preparadas aqui.</Vazio>}
        </Cartao>
        <Cartao titulo="Conversas de desenvolvimento">
          <ListaSituacoes situacoes={d.situacoes.filter((s) => s.frente === 'desenvolvimento')} nomes={nomes} />
          {devolutivas.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Devolutiva do assessment pendente: {devolutivas.map((p) => p.nome).join(', ')}.</p>}
        </Cartao>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Comportamento
export function Comportamento({ d, agora }: P) {
  const nomes = nomesDe(d)
  const comportamentais = d.registros.filter((r) => ['observacao', 'alinhamento', 'ocorrencia', 'reconhecimento'].includes(r.tipo))
  const conversas = d.situacoes.filter((s) => s.frente === 'comportamento' || s.tipo === 'conversa_dificil')
  return (
    <>
      <Cabecalho titulo="Comportamento" descricao="Conduta, colaboração e conversas difíceis. Aqui entram fatos observáveis e o que foi combinado; nada de rótulos ou suposições sobre o que a pessoa sente." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Registros em 60 dias" valor={comportamentais.filter((r) => dentroDe(r.data_fato, 60, agora)).length} />
        <Numero rotulo="Reconhecimentos" valor={comportamentais.filter((r) => r.tipo === 'reconhecimento').length} />
        <Numero rotulo="Conversas difíceis" valor={conversas.length} detalhe={`${conversas.filter((s) => s.status === 'aplicada').length} já feita(s)`} />
        <Numero rotulo="Alinhamento cultural (média)" valor={media(d.pessoas.map((p) => p.contexto?.alinhamento?.cultural)) === null ? '—' : `${num(media(d.pessoas.map((p) => p.contexto?.alinhamento?.cultural)))}%`} detalhe="Plataforma Boomit" />
      </div>
      <Atalhos itens={[
        { to: '/preparar?tipo=conversa_dificil', titulo: 'Preparar conversa difícil', texto: 'Interesses de cada parte e pontos de acordo possíveis.' },
        { to: '/agenda', titulo: 'Agendar a conversa', texto: 'Lembrete na véspera para preparar e, depois, pedido de registro.' },
        { to: '/registrar', titulo: 'Registrar um fato observado', texto: 'Data, o que aconteceu e se fica privado ou vai para a linha de gestão.' },
      ]} />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Cartao titulo="Registros recentes">
          {comportamentais.length ? (
            <ul className="divide-y text-sm">
              {comportamentais.slice(0, 12).map((r) => (
                <li key={r.id} className="py-2">
                  <p className="text-xs text-muted-foreground">{ROTULO_REGISTRO[r.tipo] ?? r.tipo} · {nomes.get(r.colaborador_id) ?? ''} · {formatarData(r.data_fato)} · {r.visibilidade === 'privado' ? 'privado' : 'linha de gestão'}</p>
                  <p>{r.texto}</p>
                </li>
              ))}
            </ul>
          ) : <Vazio>Nenhum registro de comportamento.</Vazio>}
        </Cartao>
        <div className="flex flex-col gap-5">
          <Cartao titulo="Boas práticas">
            <ul className="list-disc space-y-1 pl-4 text-sm">
              <li>Descreva o fato (quando, onde, o que foi dito ou feito), não a intenção.</li>
              <li>Fale do impacto no trabalho e na equipe.</li>
              <li>Pergunte antes de concluir: há contexto que você não conhece?</li>
              <li>Feche com um combinado e uma data para conversar de novo.</li>
              <li>Assédio, discriminação ou violência não são conversa de alinhamento: vá para <Link to="/crises" className="underline">Crises</Link>.</li>
            </ul>
          </Cartao>
          <Cartao titulo="Conversas preparadas">
            <ListaSituacoes situacoes={conversas} nomes={nomes} />
          </Cartao>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Organização
export function Organizacao({ d, agora }: P) {
  const areas = contarPor(d.pessoas, (p) => p.area)
  const emAnalise = d.decisoes.filter((x) => x.status === 'em_analise')
  const reunioes = d.compromissos.filter((c) => c.tipo === 'reuniao_equipe' && c.status === 'agendado' && Date.parse(c.inicio) >= agora)
  const e = d.empresa
  return (
    <>
      <Cabecalho titulo="Organização" descricao="Prioridades, papéis, decisões e o que está na sua alçada. Use as políticas da empresa como referência antes de decidir." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Pessoas na equipe" valor={d.pessoas.length} detalhe={areas.map(([a, n]) => `${a} ${n}`).join(' · ')} />
        <Numero rotulo="Decisões em análise" valor={emAnalise.length} />
        <Numero rotulo="Decisões registradas" valor={d.decisoes.filter((x) => x.status === 'decidida' || x.status === 'revisada').length} />
        <Numero rotulo="Reuniões de equipe agendadas" valor={reunioes.length} />
      </div>
      <Atalhos itens={[
        { to: '/decisoes', titulo: 'Apoio à decisão', texto: 'Critérios, alternativas, riscos e alçada.' },
        { to: '/preparar?tipo=decisao_alcada', titulo: 'Pedido de alguém da equipe', texto: 'Troca de turno, folga, prioridade: está na sua alçada?' },
        { to: '/preparar?tipo=preparacao_reuniao', titulo: 'Preparar reunião', texto: 'Pauta, objetivos e tempo por tema.' },
      ]} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Alçadas da empresa">
          {d.alcadas.length ? (
            <ul className="space-y-3 text-sm">
              {d.alcadas.map((a) => (
                <li key={a.id}>
                  <p className="font-semibold">{a.cargo_referencia ?? a.nivel}</p>
                  <p><span className="text-xs text-muted-foreground">Decide sozinho: </span>{a.pode_decidir}</p>
                  {a.limites && <p><span className="text-xs text-muted-foreground">Limites: </span>{a.limites}</p>}
                  {a.consultar && <p><span className="text-xs text-muted-foreground">Acima disso, consultar: </span>{a.consultar}</p>}
                </li>
              ))}
            </ul>
          ) : <Vazio>Nenhuma alçada cadastrada.</Vazio>}
        </Cartao>
        <Cartao titulo="Prioridades da empresa">
          {e?.estrategias_prioritarias?.length ? (
            <ol className="list-decimal space-y-2 pl-4 text-sm">
              {e.estrategias_prioritarias.slice(0, 4).map((x) => <li key={x.titulo}><span className="font-medium">{x.titulo}</span>{x.descricao && <span className="block text-xs text-muted-foreground">{x.descricao}</span>}</li>)}
            </ol>
          ) : <Vazio>Sem prioridades registradas na Plataforma Boomit.</Vazio>}
          {e?.pontos_chave?.length ? (
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{e.pontos_chave.slice(0, 4).map((p) => <li key={p.metrica}>{p.metrica}{p.meta ? `: ${p.meta}` : ''}</li>)}</ul>
          ) : null}
        </Cartao>
        <Cartao titulo="Decisões em andamento">
          {emAnalise.length ? (
            <ul className="space-y-1 text-sm">{emAnalise.map((x) => <li key={x.id}><Link to={`/decisoes/${x.id}`} className="hover:underline">{x.titulo}</Link>{x.prazo_decisao && <span className="text-xs text-muted-foreground"> · até {formatarData(x.prazo_decisao)}</span>}</li>)}</ul>
          ) : <Vazio>Nenhuma decisão em análise.</Vazio>}
        </Cartao>
        <Cartao titulo="Próximas reuniões de equipe">
          {reunioes.length ? (
            <ul className="space-y-1 text-sm">{reunioes.map((r) => <li key={r.id}><Link to={`/agenda?compromisso=${r.id}`} className="hover:underline">{r.titulo}</Link> <span className="text-xs text-muted-foreground">· {formatarData(r.inicio)}</span></li>)}</ul>
          ) : <Vazio>Nenhuma reunião de equipe agendada. <Link to="/agenda" className="underline">Agendar</Link></Vazio>}
        </Cartao>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Crises
const SENSIVEIS = [
  'Assédio moral ou sexual',
  'Discriminação (raça, gênero, orientação, idade, deficiência, religião…)',
  'Violência ou ameaça',
  'Risco à saúde ou à integridade de alguém',
  'Fraude, desvio ou outra ilegalidade',
  'Denúncia que envolve a liderança',
]

export function Crises({ d }: P) {
  const encaminhadas = d.situacoes.filter((s) => s.sensivel || s.status === 'encaminhada')
  const canais = Object.entries(d.canais)
  return (
    <>
      <Cabecalho titulo="Crises" descricao="Situações sensíveis não são tratadas pelo Copiloto: ele acolhe, indica o canal da empresa e ajuda só a preparar o encaminhamento." />
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-semibold">Se alguém corre risco agora, acione os canais de emergência (SAMU 192, Polícia 190) antes de qualquer outra coisa.</p>
        <p className="mt-1">Em sofrimento emocional, o CVV atende 24 horas pelo 188.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Canais da empresa">
          {canais.length ? (
            <ul className="space-y-2 text-sm">{canais.map(([k, v]) => <li key={k}><span className="text-xs uppercase text-muted-foreground">{k === 'rh' ? 'RH' : k === 'etica' ? 'Ética' : k === 'juridico' ? 'Jurídico' : k}</span><p>{v}</p></li>)}</ul>
          ) : <Vazio>A empresa ainda não cadastrou os canais. Procure o RH.</Vazio>}
        </Cartao>
        <Cartao titulo="O que é situação sensível">
          <ul className="list-disc space-y-1 pl-4 text-sm">{SENSIVEIS.map((s) => <li key={s}>{s}</li>)}</ul>
        </Cartao>
        <Cartao titulo="Como agir">
          <ol className="list-decimal space-y-1 pl-4 text-sm">
            <li>Acolha e escute, sem julgar nem prometer sigilo que você não pode garantir.</li>
            <li>Não investigue por conta própria nem confronte os envolvidos.</li>
            <li>Encaminhe ao canal adequado o quanto antes.</li>
            <li>Registre só o encaminhamento (data e canal), não os detalhes.</li>
            <li>Acompanhe com o RH o que cabe a você como líder.</li>
          </ol>
          <Link to="/preparar" className="mt-3 inline-block text-sm underline">Relatar uma situação e preparar o encaminhamento</Link>
        </Cartao>
        <Cartao titulo="Seus encaminhamentos">
          {encaminhadas.length ? (
            <ul className="space-y-1 text-sm">{encaminhadas.map((s) => <li key={s.id}><Link to={`/situacoes/${s.id}`} className="hover:underline">Encaminhamento de {formatarData(s.criado_em)}</Link></li>)}</ul>
          ) : <Vazio>Nenhum encaminhamento.</Vazio>}
          <p className="mt-2 text-xs text-muted-foreground">Só você vê. O título e o relato não aparecem nesta lista.</p>
        </Cartao>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- Liderança
export function Lideranca({ d, agora }: P) {
  const cad = cadenciaDeUmAUm(d.compromissos, d.pessoas.map((p) => p.id), agora)
  const nomes = nomesDe(d)
  const preparadas = d.situacoes.filter((s) => !s.sensivel)
  const feitas = preparadas.filter((s) => s.aplicada_em)
  const realizados30 = d.compromissos.filter((c) => c.status === 'realizado' && dentroDe(c.realizado_em ?? c.inicio, 30, agora)).length
  const ctx = d.eu?.contexto
  const e = d.empresa
  return (
    <>
      <Cabecalho titulo="Liderança" descricao="A sua prática como líder: cadência com a equipe, conversas preparadas que viraram conversas reais, decisões e o seu próprio desenvolvimento." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Cadência de 1:1" valor={cad.pct === null ? '—' : `${cad.pct}%`} detalhe={`${cad.emDia.length} de ${d.pessoas.length} com 1:1 em 30 dias`} />
        <Numero rotulo="Compromissos realizados" valor={realizados30} detalhe="Últimos 30 dias" />
        <Numero rotulo="Preparadas → feitas" valor={`${feitas.length} de ${preparadas.length}`} detalhe="Conversas preparadas que aconteceram" />
        <Numero rotulo="Decisões revisadas" valor={`${d.decisoes.filter((x) => x.status === 'revisada').length} de ${d.decisoes.filter((x) => x.status !== 'em_analise' && x.status !== 'cancelada').length}`} />
      </div>
      <InsightsDaSemana resumido />
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Cadência de 1:1">
          <ul className="space-y-1 text-sm">
            {d.pessoas.map((p) => {
              const ult = cad.ultimo.get(p.id)
              const situacao = cad.emDia.includes(p.id) ? 'Em dia' : cad.agendados.includes(p.id) ? 'Agendado' : 'Sem 1:1 recente'
              return (
                <li key={p.id} className="flex justify-between gap-2">
                  <span>{p.nome}<span className="block text-xs text-muted-foreground">{ult ? `Último em ${formatarData(ult)}` : 'Nenhum 1:1 na agenda'}</span></span>
                  <span className={cn('h-fit rounded-full px-2 py-0.5 text-xs', situacao === 'Em dia' ? 'bg-boomit-verde text-white' : situacao === 'Agendado' ? 'bg-secondary' : 'bg-amber-100 text-amber-900')}>{situacao}</span>
                </li>
              )
            })}
          </ul>
          {cad.semCadencia.length > 0 && <Link to="/agenda" className="mt-2 inline-block text-xs underline">Agendar 1:1 com {cad.semCadencia.slice(0, 3).map((id) => nomes.get(id)?.split(' ')[0]).join(', ')}{cad.semCadencia.length > 3 ? '…' : ''}</Link>}
        </Cartao>
        <Cartao titulo="Seu desenvolvimento (Plataforma Boomit)">
          {ctx ? (
            <div className="space-y-2 text-sm">
              {ctx.gaps_prioritarios.length > 0 && <p><span className="text-xs text-muted-foreground">Gaps prioritários: </span>{ctx.gaps_prioritarios.slice(0, 3).map((g) => g.competencia).join(', ')}</p>}
              {ctx.pdi_boomit?.pontos_chave.length ? <p><span className="text-xs text-muted-foreground">Seu PDI: </span>{ctx.pdi_boomit.pontos_chave.map((p) => p.titulo).join(', ')}</p> : null}
              {ctx.ia?.nivel ? <p><span className="text-xs text-muted-foreground">Maturidade em IA: </span>N{ctx.ia.nivel} · {NIVEIS_IA[ctx.ia.nivel]?.nome}</p> : null}
              {ctx.focus?.mentor && <p><span className="text-xs text-muted-foreground">Mentor Focus: </span>{ctx.focus.mentor} · {ctx.focus.sessoes.length} sessão(ões)</p>}
              <p className="text-xs text-muted-foreground">Seu mentor Boomit só vê as preparações que você escolher compartilhar.</p>
            </div>
          ) : <Vazio>Seu contexto da Plataforma Boomit ainda não foi sincronizado.</Vazio>}
        </Cartao>
        <Cartao titulo="Lente da empresa" className="lg:col-span-2">
          {e?.maturidade ? (
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">Maturidade de gestão {e.maturidade.nota ?? ''}</span>{e.maturidade.rotulo ? ` · ${e.maturidade.rotulo}` : ''}</p>
              {e.maturidade.diagnostico && <p>{e.maturidade.diagnostico}</p>}
              {e.maturidade.proxima_etapa && <p className="text-muted-foreground">Próxima etapa: {e.maturidade.proxima_etapa}</p>}
            </div>
          ) : <Vazio>Sem diagnóstico da empresa na Plataforma Boomit.</Vazio>}
        </Cartao>
      </div>
    </>
  )
}
