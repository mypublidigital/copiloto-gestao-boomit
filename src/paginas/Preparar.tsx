// M3 · Preparar situação: tipo → pessoa → relato → contexto (fontes desmarcáveis) → plano.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { type Fonte, ROTULO_TIPO_PREPARACAO, type TipoPreparacao } from '@/dominio/preparacao'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { cn } from '@/lib/utils'
import { chamarFuncao } from '@/servicos/funcoes'

const TIPOS = Object.keys(ROTULO_TIPO_PREPARACAO) as TipoPreparacao[]

const EXEMPLO: Record<TipoPreparacao, string> = {
  feedback: 'Ex.: duas entregas fora do prazo combinado na última quinzena',
  pdi: 'Ex.: vamos revisar o PDI; quero focar em planejamento e comunicação com clientes',
  conversa_dificil: 'Ex.: atrito entre ela e o analista de suporte sobre quem responde ao cliente nos chamados urgentes',
  decisao_alcada: 'Ex.: ele pediu para trocar o turno de sexta por segunda na próxima semana',
  preparacao_reuniao: 'Ex.: 1:1 quinzenal; da última vez combinamos o plano semanal',
}

const NOME_CAMADA: Record<number, string> = { 1: 'Políticas e alçadas', 4: 'Empresa', 5: 'Pessoa', 6: 'Histórico', 7: 'Reuniões e mentorias' }

type FonteContexto = Omit<Fonte, 'apelido'>

export function Preparar() {
  const { vinculo } = useSessao()
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const [tipo, setTipo] = useState<TipoPreparacao>((params.get('tipo') as TipoPreparacao | null) ?? 'feedback')
  const [pessoaId, setPessoaId] = useState(params.get('pessoa') ?? '')
  const [relato, setRelato] = useState('')
  const [fontes, setFontes] = useState<FonteContexto[] | null>(null)
  const [excluidas, setExcluidas] = useState<Set<string>>(new Set())
  const [estado, setEstado] = useState<'livre' | 'carregando-contexto' | 'gerando'>('livre')
  const [erro, setErro] = useState<string | null>(null)

  const equipe = useConsulta(async () => {
    if (!vinculo?.colaborador_id) return []
    const vinculos = exigir(await supabase.from('vinculo_lideranca').select('liderado_id').eq('lider_id', vinculo.colaborador_id).is('fim', null))
    if (vinculos.length === 0) return []
    return exigir(await supabase.from('colaborador').select('id, nome, cargo').in('id', vinculos.map((v) => v.liderado_id)).order('nome'))
  }, [vinculo?.colaborador_id])

  if (vinculo?.papel !== 'lider') return <p className="text-muted-foreground">Preparar conversas é para líderes.</p>

  async function verContexto() {
    setErro(null)
    setEstado('carregando-contexto')
    try {
      const r = await chamarFuncao<{ fontes: FonteContexto[] }>('preparar-situacao', { acao: 'contexto', colaborador_id: pessoaId, tipo })
      setFontes(r.fontes)
      setExcluidas(new Set())
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEstado('livre')
    }
  }

  async function gerar() {
    setErro(null)
    setEstado('gerando')
    try {
      const r = await chamarFuncao<{ situacao_id: string }>('preparar-situacao', {
        acao: 'gerar',
        colaborador_id: pessoaId,
        tipo,
        relato,
        fontes_excluidas: [...excluidas],
      })
      navegar(`/situacoes/${r.situacao_id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setEstado('livre')
    }
  }

  const alternar = (id: string) =>
    setExcluidas((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })

  const podeAvancar = pessoaId && relato.trim().length >= 10

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Preparar</p>
        <h1 className="text-2xl font-semibold">O que você precisa preparar?</h1>
      </header>

      <Cartao titulo="1 · Tipo de conversa">
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => {
                setTipo(t)
                setFontes(null)
              }}
              className={cn('rounded-md border px-3 py-1.5 text-sm', tipo === t ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary')}
            >
              {ROTULO_TIPO_PREPARACAO[t]}
            </button>
          ))}
        </div>
      </Cartao>

      <Cartao titulo="2 · Pessoa e relato">
        <Estado consulta={equipe}>
          {(pessoas) => (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium" htmlFor="pessoa">
                Com quem é a conversa?
              </label>
              <select
                id="pessoa"
                value={pessoaId}
                onChange={(e) => {
                  setPessoaId(e.target.value)
                  setFontes(null)
                }}
                className="rounded-md border bg-background px-3 py-2"
              >
                <option value="">Escolha uma pessoa da sua equipe</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                    {p.cargo ? ` · ${p.cargo}` : ''}
                  </option>
                ))}
              </select>
              <label className="text-sm font-medium" htmlFor="relato">
                O que aconteceu? (fatos, em poucas frases)
              </label>
              <textarea
                id="relato"
                rows={4}
                value={relato}
                onChange={(e) => setRelato(e.target.value)}
                className="rounded-md border bg-background px-3 py-2"
                placeholder={EXEMPLO[tipo]}
              />
              <div>
                <Button onClick={verContexto} disabled={!podeAvancar || estado !== 'livre'}>
                  {estado === 'carregando-contexto' ? 'Carregando contexto…' : 'Ver contexto'}
                </Button>
              </div>
            </div>
          )}
        </Estado>
      </Cartao>

      {fontes && (
        <Cartao titulo="3 · Contexto que entra no plano">
          <p className="mb-3 text-sm text-muted-foreground">Desmarque o que não quer que a IA considere. O relato sempre entra.</p>
          {[1, 4, 5, 6, 7].map((camada) => {
            const daCamada = fontes.filter((f) => f.camada === camada)
            if (daCamada.length === 0) return null
            return (
              <fieldset key={camada} className="mb-4">
                <legend className="mb-1 text-sm font-semibold">{NOME_CAMADA[camada]}</legend>
                <ul className="space-y-1">
                  {daCamada.map((f) => (
                    <li key={f.fonte_id}>
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={!excluidas.has(f.fonte_id)} onChange={() => alternar(f.fonte_id)} />
                        <span>
                          <span className="font-medium">{f.rotulo}</span>
                          <span className="block text-muted-foreground">{f.conteudo.length > 160 ? `${f.conteudo.slice(0, 157)}…` : f.conteudo}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )
          })}
          <Button onClick={gerar} disabled={estado !== 'livre' || !podeAvancar}>
            {estado === 'gerando' ? 'Preparando o plano… (pode levar até um minuto)' : 'Gerar plano'}
          </Button>
        </Cartao>
      )}

      {erro && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  )
}
