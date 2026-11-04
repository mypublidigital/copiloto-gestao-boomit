// M5 · Registro rápido: feedback, reconhecimento, observação, alinhamento ou ocorrência,
// em poucos campos. Privado (só você) ou linha de gestão (quem lidera a pessoa vê).
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useSessao } from '@/auth/sessao'
import { Cartao, Estado } from '@/components/Estado'
import { Button } from '@/components/ui/button'
import { hojeSaoPaulo } from '@/dominio/combinados'
import { supabase } from '@/lib/supabase'
import { exigir, useConsulta } from '@/lib/useConsulta'
import type { Database } from '@/tipos/banco'

type TipoRegistro = Database['public']['Enums']['tipo_registro']
const TIPOS: { valor: TipoRegistro; rotulo: string }[] = [
  { valor: 'feedback', rotulo: 'Feedback' },
  { valor: 'reconhecimento', rotulo: 'Reconhecimento' },
  { valor: 'observacao', rotulo: 'Observação' },
  { valor: 'alinhamento', rotulo: 'Alinhamento' },
  { valor: 'ocorrencia', rotulo: 'Ocorrência' },
]

export function Registrar() {
  const { vinculo } = useSessao()
  const navegar = useNavigate()
  const [params] = useSearchParams()
  const hoje = hojeSaoPaulo()
  const [pessoa, setPessoa] = useState(params.get('pessoa') ?? '')
  const [tipo, setTipo] = useState<TipoRegistro>('feedback')
  const [texto, setTexto] = useState('')
  const [data, setData] = useState(hoje)
  const [publico, setPublico] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const equipe = useConsulta(async () => {
    if (!vinculo?.colaborador_id) return []
    const v = exigir(await supabase.from('vinculo_lideranca').select('liderado_id').eq('lider_id', vinculo.colaborador_id).is('fim', null))
    if (!v.length) return []
    return exigir(await supabase.from('colaborador').select('id, nome').in('id', v.map((x) => x.liderado_id)).order('nome'))
  }, [vinculo?.colaborador_id])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!vinculo) return
    setSalvando(true)
    setErro(null)
    const { error } = await supabase.from('registro').insert({
      empresa_id: vinculo.empresa_id,
      colaborador_id: pessoa,
      tipo,
      texto: texto.trim(),
      data_fato: data,
      visibilidade: publico ? 'linha_gestao' : 'privado',
    })
    setSalvando(false)
    if (error) setErro(`Não foi possível registrar: ${error.message}`)
    else navegar(`/pessoas/${pessoa}`)
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Registrar</p>
        <h1 className="text-2xl font-semibold">Registro rápido</h1>
      </header>
      <Cartao titulo="O que aconteceu">
        <Estado consulta={equipe}>
          {(pessoas) => (
            <form onSubmit={salvar} className="grid gap-3">
              <label className="text-sm font-medium">
                Pessoa
                <select required value={pessoa} onChange={(e) => setPessoa(e.target.value)} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal">
                  <option value="">Escolha</option>
                  {pessoas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de registro">
                {TIPOS.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    role="radio"
                    aria-checked={tipo === t.valor}
                    onClick={() => setTipo(t.valor)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${tipo === t.valor ? 'border-primary bg-primary text-primary-foreground' : ''}`}
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
              <label className="text-sm font-medium">
                Fato observado
                <textarea required rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} className="mt-1 block w-full rounded-md border bg-background px-3 py-2 font-normal" />
              </label>
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-sm font-medium">
                  Data
                  <input type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} className="mt-1 block rounded-md border bg-background px-3 py-2" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
                  Visível para a linha de gestão (desmarque para deixar só para você)
                </label>
              </div>
              <div>
                <Button type="submit" disabled={salvando || !pessoa || !texto.trim()}>
                  {salvando ? 'Registrando…' : 'Registrar'}
                </Button>
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
            </form>
          )}
        </Estado>
      </Cartao>
    </div>
  )
}
