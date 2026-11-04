// M6 · Fontes e evidências (Sprint 4): enviar reuniões, mentorias e documentos e acompanhar o
// processamento. Reunião ou mentoria só entra com a confirmação de que os participantes foram
// avisados (regra inviolável 10, também garantida no banco).
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado } from '@/components/Estado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { hojeSaoPaulo } from '@/dominio/combinados'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import { chamarFuncao } from '@/servicos/funcoes'
import { EXIGE_AVISO, ROTULO_STATUS_DOC, ROTULO_TIPO_DOC, type TipoDocumento } from '@/dominio/documentos'

const ACEITOS = '.txt,.md,.vtt,.docx,.pdf'
const LIMITE_MB = 10

export function Fontes() {
  const { vinculo } = useSessao()
  const navegar = useNavigate()
  const [recarga, setRecarga] = useState(0)
  const [tipo, setTipo] = useState<TipoDocumento>('anotacao_reuniao')
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(hojeSaoPaulo())
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [avisados, setAvisados] = useState(false)
  const [pessoa, setPessoa] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const consulta = useConsulta(async () => {
    const [docs, equipe] = await Promise.all([
      supabase.from('documento_fonte').select('id, titulo, tipo, data_evento, status_processamento, criado_em, extracao(status_revisao)').order('criado_em', { ascending: false }),
      vinculo?.colaborador_id
        ? supabase.from('vinculo_lideranca').select('liderado:liderado_id(id, nome)').eq('lider_id', vinculo.colaborador_id).is('fim', null)
        : Promise.resolve({ data: [], error: null }),
    ])
    return {
      documentos: exigir(docs),
      equipe: (equipe.data ?? []).map((v) => v.liderado).filter((p): p is { id: string; nome: string } => Boolean(p)).sort((a, b) => a.nome.localeCompare(b.nome)),
    }
  }, [recarga, vinculo?.colaborador_id])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!vinculo?.colaborador_id || !arquivo) return
    if (arquivo.size > LIMITE_MB * 1024 * 1024) return setErro(`Arquivo maior que ${LIMITE_MB} MB.`)
    setEnviando(true)
    setErro(null)
    const id = crypto.randomUUID()
    const nome = arquivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_')
    const caminho = `${vinculo.empresa_id}/${id}/${nome}`
    // Sem RETURNING: a política de leitura de documento_fonte consulta a própria tabela.
    const doc = await supabase.from('documento_fonte').insert({
      id,
      empresa_id: vinculo.empresa_id,
      lider_id: vinculo.colaborador_id,
      tipo,
      titulo: titulo.trim() || arquivo.name,
      data_evento: data || null,
      storage_path: caminho,
      participantes_avisados: avisados,
    })
    if (doc.error) {
      setEnviando(false)
      return setErro(`Não foi possível registrar: ${doc.error.message}`)
    }
    const up = await supabase.storage.from('fontes').upload(caminho, arquivo, { upsert: false })
    if (up.error) {
      setEnviando(false)
      return setErro(`O arquivo não subiu: ${up.error.message}`)
    }
    if (pessoa) await supabase.from('documento_colaborador').insert({ documento_id: id, colaborador_id: pessoa, confirmado: true })
    try {
      await chamarFuncao('processar-documento', { documento_id: id })
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    }
    setEnviando(false)
    navegar(`/fontes/${id}`)
  }

  if (vinculo?.papel !== 'lider') {
    return <p className="text-muted-foreground">Enviar reuniões e documentos é para líderes nesta versão.</p>
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Fontes e evidências</p>
        <h1 className="text-2xl font-semibold">Reuniões, mentorias e documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O Copiloto extrai combinados, decisões e temas. Nada vira combinado sem a sua revisão, e os trechos passam a apoiar as próximas preparações.
        </p>
      </header>

      <Cartao titulo="Enviar">
        <form onSubmit={enviar} className="grid gap-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-medium">
              Tipo
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal">
                {Object.entries(ROTULO_TIPO_DOC).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-medium">
              Data da reunião
              <input type="date" max={hojeSaoPaulo()} value={data} onChange={(e) => setData(e.target.value)} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal" />
            </label>
            <label className="font-medium">
              Título
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: 1:1 com Ana" className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal" />
            </label>
            <Estado consulta={consulta}>
              {({ equipe }) => (
                <label className="font-medium">
                  Pessoa (opcional)
                  <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal">
                    <option value="">O Copiloto sugere pelas pessoas citadas</option>
                    {equipe.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </Estado>
          </div>
          <label className="font-medium">
            Arquivo ({ACEITOS.replaceAll(',', ', ')}; até {LIMITE_MB} MB)
            <input type="file" required accept={ACEITOS} onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm font-normal" />
          </label>
          {EXIGE_AVISO.has(tipo) && (
            <label className="flex items-start gap-2 rounded-md border bg-secondary p-3">
              <input type="checkbox" className="mt-0.5" checked={avisados} onChange={(e) => setAvisados(e.target.checked)} />
              <span>Confirmo que os participantes foram avisados de que esta reunião seria usada como fonte no Copiloto.</span>
            </label>
          )}
          <div>
            <Button type="submit" disabled={enviando || !arquivo || (EXIGE_AVISO.has(tipo) && !avisados)}>
              {enviando ? 'Enviando…' : 'Enviar e processar'}
            </Button>
          </div>
          {erro && <p className="text-destructive">{erro}</p>}
        </form>
      </Cartao>

      <Cartao titulo="Enviados">
        <Estado consulta={consulta}>
          {({ documentos }) =>
            documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada enviado ainda. Para testar, use as anotações fictícias em fixtures/reunioes/.</p>
            ) : (
              <ul className="divide-y text-sm">
                {documentos.map((d) => {
                  const pendentes = (d.extracao ?? []).filter((x) => x.status_revisao === 'pendente').length
                  return (
                    <li key={d.id}>
                      <Link to={`/fontes/${d.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 hover:bg-secondary/60">
                        <span className="w-24 text-muted-foreground">{formatarData(d.data_evento ?? d.criado_em)}</span>
                        <span className="font-medium">{d.titulo}</span>
                        <span className="text-muted-foreground">{ROTULO_TIPO_DOC[d.tipo]}</span>
                        <Badge variant="outline">{ROTULO_STATUS_DOC[d.status_processamento] ?? d.status_processamento}</Badge>
                        {pendentes > 0 && <Badge className="bg-boomit-taupe text-boomit-claro">{pendentes} para revisar</Badge>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )
          }
        </Estado>
        <button type="button" className="mt-2 text-xs underline" onClick={() => setRecarga((n) => n + 1)}>
          Atualizar
        </button>
      </Cartao>
    </div>
  )
}
