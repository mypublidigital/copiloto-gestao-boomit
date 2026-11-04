// Situação preparada: plano editável com referências clicáveis e versões, ou a tela de
// encaminhamento quando o relato é sensível (docs/03 §8). Tudo aqui é ensaio privado do líder.
import { type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { type CombinadoProposto, type ConteudoPreparacao, conteudoPreparacaoSchema, type Fonte, type Plano, ROTULO_RESPONSAVEL } from '@/dominio/preparacao'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { useConsulta } from '@/lib/useConsulta'
import type { Json } from '@/tipos/banco'
import { AposConversa } from './situacao/AposConversa'

async function carregar(id: string) {
  const sit = await supabase.from('situacao').select('id, empresa_id, colaborador_id, titulo, status, sensivel, relato_inicial, aplicada_em, relato_aplicacao, criado_em, colaborador:colaborador_id(id, nome)').eq('id', id).maybeSingle()
  if (sit.error) throw new Error(sit.error.message)
  if (!sit.data) return null
  if (sit.data.sensivel) {
    const { data: empresa } = await supabase.from('empresa').select('config').eq('id', sit.data.empresa_id).maybeSingle()
    const canais = ((empresa?.config ?? {}) as { canais_encaminhamento?: Record<string, string> }).canais_encaminhamento ?? {}
    return { situacao: sit.data, canais, preparacao: null }
  }
  const prep = await supabase.from('preparacao').select('versao, conteudo, gerado_por, criado_em').eq('situacao_id', id).order('versao', { ascending: false }).limit(1).maybeSingle()
  if (prep.error) throw new Error(prep.error.message)
  const conteudo = prep.data ? conteudoPreparacaoSchema.safeParse(prep.data.conteudo) : null
  return {
    situacao: sit.data,
    canais: {},
    preparacao: prep.data && conteudo?.success ? { versao: prep.data.versao, geradoPor: prep.data.gerado_por, criadoEm: prep.data.criado_em, conteudo: conteudo.data } : null,
  }
}

export function Situacao() {
  const { id = '' } = useParams()
  const [recarga, setRecarga] = useState(0)
  const consulta = useConsulta(() => carregar(id), [id, recarga])
  const { vinculo } = useSessao()
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link to="/preparar" className="text-sm text-muted-foreground hover:underline">
        ← Nova preparação
      </Link>
      <Estado consulta={consulta}>
        {(d) =>
          !d ? (
            <p className="text-muted-foreground">Situação não encontrada.</p>
          ) : d.situacao.sensivel ? (
            <Encaminhamento canais={d.canais} pessoa={d.situacao.colaborador?.nome ?? null} />
          ) : !d.preparacao ? (
            <p className="text-muted-foreground">Esta situação ainda não tem plano.</p>
          ) : (
            <PlanoEditavel
              key={d.preparacao.versao}
              situacaoId={d.situacao.id}
              empresaId={d.situacao.empresa_id}
              pessoa={d.situacao.colaborador?.nome ?? ''}
              versao={d.preparacao.versao}
              geradoPor={d.preparacao.geradoPor}
              criadoEm={d.preparacao.criadoEm}
              conteudo={d.preparacao.conteudo}
              aoSalvar={() => setRecarga((n) => n + 1)}
              depois={
                <AposConversa
                  situacaoId={d.situacao.id}
                  empresaId={d.situacao.empresa_id}
                  colaboradorId={d.situacao.colaborador_id}
                  liderId={vinculo?.colaborador_id ?? null}
                  aplicadaEm={d.situacao.aplicada_em}
                  relatoAplicacao={d.situacao.relato_aplicacao}
                  propostos={d.preparacao.conteudo.plano.combinados_propostos}
                  aoMudar={() => setRecarga((n) => n + 1)}
                />
              }
            />
          )
        }
      </Estado>
    </div>
  )
}

const CANAL: Record<string, string> = { rh: 'RH', juridico: 'Jurídico', etica: 'Canal de ética' }

function Encaminhamento({ canais, pessoa }: { canais: Record<string, string>; pessoa: string | null }) {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-muted-foreground">Modo encaminhamento{pessoa ? ` · ${pessoa}` : ''}</p>
        <h1 className="text-2xl font-semibold">Esta situação precisa ser encaminhada</h1>
      </header>
      <Cartao titulo="O que fazer agora">
        <div className="space-y-3 text-sm">
          <p>
            O relato indica uma situação séria, que pede cuidado e acompanhamento especializado. O Copiloto não prepara esta conversa e não conduz apuração: o caminho é
            levar o caso a quem a empresa definiu para isso.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Acolha a pessoa: escute, agradeça a confiança e não prometa sigilo que você não pode garantir.</li>
            <li>Registre só os fatos que você presenciou ou ouviu, com data, sem interpretações.</li>
            <li>Não investigue por conta própria nem confronte as pessoas envolvidas.</li>
            <li>Se houver risco imediato à saúde ou à integridade de alguém, acione ajuda de emergência.</li>
          </ul>
        </div>
      </Cartao>
      <Cartao titulo="Canais da empresa">
        {Object.keys(canais).length === 0 ? (
          <p className="text-sm text-muted-foreground">A empresa ainda não configurou os canais. Procure o RH.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {Object.entries(canais).map(([chave, descricao]) => (
              <li key={chave}>
                <span className="font-medium">{CANAL[chave] ?? chave}:</span> {descricao}
              </li>
            ))}
          </ul>
        )}
      </Cartao>
      <p className="text-xs text-muted-foreground">Esta situação fica marcada como encaminhada. A gestão superior vê só a contagem, nunca o conteúdo.</p>
    </section>
  )
}

const linhas = (t: string) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

function PlanoEditavel(p: {
  situacaoId: string
  empresaId: string
  pessoa: string
  versao: number
  geradoPor: string
  criadoEm: string
  conteudo: ConteudoPreparacao
  aoSalvar: () => void
  depois: ReactNode
}) {
  const plano = p.conteudo.plano
  const [resumo, setResumo] = useState(plano.resumo_situacao)
  const [abertura, setAbertura] = useState(plano.abordagem.abertura)
  const [perguntas, setPerguntas] = useState(plano.perguntas_sugeridas.join('\n'))
  const [pontos, setPontos] = useState(plano.abordagem.pontos_chave.join('\n'))
  const [combinados, setCombinados] = useState<CombinadoProposto[]>(plano.combinados_propostos)
  const [fonteAberta, setFonteAberta] = useState<Fonte | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const porId = new Map(p.conteudo.fontes.map((f) => [f.fonte_id, f]))
  const Chips = ({ ids }: { ids: string[] }) => (
    <span className="ml-1 inline-flex flex-wrap gap-1">
      {ids.map((id) => {
        const f = porId.get(id)
        return (
          <button
            key={id}
            type="button"
            onClick={() => setFonteAberta(f ?? null)}
            className="rounded bg-boomit-cinza-azulado px-1.5 text-xs font-medium text-boomit-preto hover:bg-boomit-verde hover:text-boomit-claro"
            title={f?.rotulo ?? id}
          >
            {f?.apelido ?? '?'}
          </button>
        )
      })}
    </span>
  )

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const editado: Plano = {
      ...plano,
      resumo_situacao: resumo,
      perguntas_sugeridas: linhas(perguntas),
      abordagem: { ...plano.abordagem, abertura, pontos_chave: linhas(pontos) },
      combinados_propostos: combinados.filter((c) => c.descricao.trim()),
    }
    const conteudo = { ...p.conteudo, plano: editado }
    const { error } = await supabase.from('preparacao').insert({
      situacao_id: p.situacaoId,
      empresa_id: p.empresaId,
      versao: p.versao + 1,
      conteudo: conteudo as unknown as Json,
      gerado_por: 'lider',
      revisada: true,
    })
    setSalvando(false)
    if (error) setErro(`Não foi possível salvar: ${error.message}`)
    else p.aoSalvar()
  }

  const campo = 'w-full rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-4">
        <header>
          <p className="text-sm text-muted-foreground">
            Feedback · {p.pessoa} · versão {p.versao} ({p.geradoPor === 'ia' ? 'gerada pela IA' : 'editada por você'} em {formatarData(p.criadoEm)})
          </p>
          <h1 className="text-2xl font-semibold">Plano da conversa</h1>
          <p className="mt-1 text-xs text-muted-foreground">Ensaio privado: só você vê. Revise os fatos antes de usar.</p>
        </header>

        {p.conteudo.alertas.length > 0 && (
          <p className="rounded-md border bg-secondary px-3 py-2 text-xs">
            A verificação automática ajustou o plano: {p.conteudo.alertas.length} ajuste(s) (fatos sem fonte foram para "a confirmar"; frases fora das regras foram removidas).
          </p>
        )}

        <Cartao titulo="Resumo da situação">
          <textarea className={campo} rows={3} value={resumo} onChange={(e) => setResumo(e.target.value)} />
        </Cartao>

        <Cartao titulo="Fatos confirmados (com fonte)">
          {plano.fatos_confirmados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum fato com fonte.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {plano.fatos_confirmados.map((f) => (
                <li key={f.texto}>
                  {f.texto}
                  <Chips ids={f.fonte_ids} />
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Fatos a confirmar">
          {plano.fatos_a_confirmar.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendente.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {plano.fatos_a_confirmar.map((f) => (
                <li key={f.texto}>
                  {f.texto} <span className="text-muted-foreground">— {f.por_que_importa}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Hipóteses para testar na conversa">
          <ul className="space-y-2 text-sm">
            {plano.hipoteses.map((h) => (
              <li key={h.texto}>
                <span className="font-medium">{h.texto}</span>
                {h.base.length > 0 && <Chips ids={h.base} />}
                <span className="block text-muted-foreground">Como testar: {h.como_testar_na_conversa}</span>
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="Abordagem">
          <label className="text-sm font-medium" htmlFor="abertura">
            Abertura
          </label>
          <textarea id="abertura" className={`${campo} mb-3`} rows={2} value={abertura} onChange={(e) => setAbertura(e.target.value)} />
          <label className="text-sm font-medium" htmlFor="pontos">
            Pontos-chave (um por linha)
          </label>
          <textarea id="pontos" className={`${campo} mb-3`} rows={4} value={pontos} onChange={(e) => setPontos(e.target.value)} />
          {plano.abordagem.evitar.length > 0 && <p className="text-sm text-muted-foreground">Evitar: {plano.abordagem.evitar.join(' · ')}</p>}
        </Cartao>

        <Cartao titulo="Perguntas sugeridas (uma por linha)">
          <textarea className={campo} rows={5} value={perguntas} onChange={(e) => setPerguntas(e.target.value)} />
        </Cartao>

        <Cartao titulo="Combinados propostos">
          <p className="mb-2 text-xs text-muted-foreground">Ainda não são combinados: você confirma depois da conversa real.</p>
          <ul className="space-y-3">
            {combinados.map((c, i) => (
              <li key={i} className="grid gap-2 rounded border p-3 sm:grid-cols-[1fr_9rem_6rem]">
                <input
                  aria-label="Descrição do combinado"
                  className={campo}
                  value={c.descricao}
                  onChange={(e) => setCombinados((l) => l.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))}
                />
                <select
                  aria-label="Responsável"
                  className={campo}
                  value={c.responsavel}
                  onChange={(e) => setCombinados((l) => l.map((x, j) => (j === i ? { ...x, responsavel: e.target.value as CombinadoProposto['responsavel'] } : x)))}
                >
                  {Object.entries(ROTULO_RESPONSAVEL).map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="number"
                    min={1}
                    aria-label="Prazo em dias"
                    className={campo}
                    value={c.prazo_sugerido_dias}
                    onChange={(e) => setCombinados((l) => l.map((x, j) => (j === i ? { ...x, prazo_sugerido_dias: Number(e.target.value) || 1 } : x)))}
                  />
                  dias
                </label>
                <p className="text-xs text-muted-foreground sm:col-span-3">Evidência: {c.evidencia_esperada}</p>
              </li>
            ))}
          </ul>
        </Cartao>

        {plano.riscos.length > 0 && (
          <Cartao titulo="Riscos">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {plano.riscos.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Cartao>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : `Salvar versão ${p.versao + 1}`}
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/simular/${p.situacaoId}`}>Simular a conversa</Link>
          </Button>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {p.depois}
      </div>

      <aside className="flex flex-col gap-4">
        <Cartao titulo="Referências">
          <ul className="space-y-1 text-sm">
            {plano.referencias.map((r) => (
              <li key={r.fonte_id}>
                <button type="button" className="text-left hover:underline" onClick={() => setFonteAberta(porId.get(r.fonte_id) ?? null)}>
                  <span className="font-medium">{r.apelido}</span> · {r.rotulo}
                </button>
              </li>
            ))}
          </ul>
        </Cartao>
        {fonteAberta && (
          <Cartao titulo={`Fonte ${fonteAberta.apelido}`}>
            <p className="text-sm font-medium">{fonteAberta.rotulo}</p>
            {fonteAberta.data && <p className="text-xs text-muted-foreground">{formatarData(fonteAberta.data)}</p>}
            <p className="mt-2 text-sm">{fonteAberta.conteudo}</p>
          </Cartao>
        )}
        {p.conteudo.informacoes_faltantes.length > 0 && (
          <Cartao titulo="Vale levantar antes">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {p.conteudo.informacoes_faltantes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </Cartao>
        )}
      </aside>
    </div>
  )
}
