// Linha do tempo da ficha (M2) com filtros por natureza e origem (Sprint 2) e edição dos
// registros do próprio líder (M5). A edição é auditada no banco (trigger registro_auditoria).
import { useState } from 'react'
import { Cartao } from '@/components/Estado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { filtrarLinhaDoTempo, type ItemLinhaDoTempo, type Natureza, type OrigemLinha, ROTULO_NATUREZA } from '@/dominio/linhaDoTempo'
import { formatarData } from '@/lib/datas'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Database } from '@/tipos/banco'

type TipoRegistro = Database['public']['Enums']['tipo_registro']
export interface MeuRegistro {
  id: string
  tipo: TipoRegistro
  texto: string
  visibilidade: 'privado' | 'linha_gestao'
}

const COR_NATUREZA: Record<Natureza, string> = {
  dado_boomit: 'bg-boomit-cinza-azulado text-boomit-preto',
  ensaio: 'bg-boomit-neutro-quente text-boomit-preto',
  relato_lider: 'bg-boomit-neutro-quente text-boomit-preto',
  aplicacao: 'bg-boomit-verde text-boomit-claro',
  combinado: 'bg-boomit-taupe text-boomit-claro',
  fonte: 'bg-secondary text-boomit-preto',
}

const TIPOS: TipoRegistro[] = ['feedback', 'reconhecimento', 'observacao', 'alinhamento', 'ocorrencia']
const ROTULO_TIPO: Record<TipoRegistro, string> = {
  feedback: 'Feedback',
  reconhecimento: 'Reconhecimento',
  observacao: 'Observação',
  alinhamento: 'Alinhamento',
  ocorrencia: 'Ocorrência',
}

export function LinhaDoTempo({ itens, meusRegistros, aoMudar }: { itens: ItemLinhaDoTempo[]; meusRegistros: MeuRegistro[]; aoMudar: () => void }) {
  const [naturezas, setNaturezas] = useState<Natureza[]>([])
  const [origem, setOrigem] = useState<OrigemLinha>('todas')
  const [editando, setEditando] = useState<string | null>(null)
  const meus = new Map(meusRegistros.map((r) => [r.id, r]))
  const presentes = [...new Set(itens.map((i) => i.natureza))]
  const visiveis = filtrarLinhaDoTempo(itens, naturezas, origem)

  return (
    <Cartao titulo="Linha do tempo">
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <select aria-label="Origem" value={origem} onChange={(e) => setOrigem(e.target.value as OrigemLinha)} className="rounded-md border bg-background px-2 py-1">
              <option value="todas">Todas as origens</option>
              <option value="boomit">Só Boomit</option>
              <option value="copiloto">Só Copiloto</option>
            </select>
            {presentes.map((n) => {
              const ativo = naturezas.includes(n)
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setNaturezas((l) => (ativo ? l.filter((x) => x !== n) : [...l, n]))}
                  className={cn('rounded-full border px-2.5 py-0.5', ativo && 'border-primary bg-primary text-primary-foreground')}
                >
                  {ROTULO_NATUREZA[n]}
                </button>
              )
            })}
          </div>
          {visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item com esses filtros.</p>
          ) : (
            <ol className="space-y-3">
              {visiveis.map((i) => {
                const meu = i.natureza === 'relato_lider' && i.origemId ? meus.get(i.origemId) : undefined
                return (
                  <li key={i.chave} className="text-sm">
                    {meu && editando === meu.id ? (
                      <EditarRegistro
                        registro={meu}
                        aoFechar={() => setEditando(null)}
                        aoSalvar={() => {
                          setEditando(null)
                          aoMudar()
                        }}
                      />
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="w-24 shrink-0 text-muted-foreground">{formatarData(i.quando)}</span>
                        <Badge className={COR_NATUREZA[i.natureza]}>{ROTULO_NATUREZA[i.natureza]}</Badge>
                        <span>{i.titulo}</span>
                        {i.detalhe && <span className="text-muted-foreground">· {i.detalhe}</span>}
                        {meu && (
                          <>
                            <span className="text-xs text-muted-foreground">{meu.visibilidade === 'privado' ? '· privado' : '· linha de gestão'}</span>
                            <button type="button" className="text-xs underline" onClick={() => setEditando(meu.id)}>
                              Editar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}
    </Cartao>
  )
}

function EditarRegistro({ registro, aoFechar, aoSalvar }: { registro: MeuRegistro; aoFechar: () => void; aoSalvar: () => void }) {
  const [tipo, setTipo] = useState(registro.tipo)
  const [texto, setTexto] = useState(registro.texto)
  const [publico, setPublico] = useState(registro.visibilidade === 'linha_gestao')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    const { error } = await supabase
      .from('registro')
      .update({ tipo, texto: texto.trim(), visibilidade: publico ? 'linha_gestao' : 'privado' })
      .eq('id', registro.id)
    setSalvando(false)
    if (error) setErro(error.message)
    else aoSalvar()
  }

  return (
    <div className="grid gap-2 rounded border p-3">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Tipo do registro" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRegistro)} className="rounded-md border bg-background px-2 py-1">
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO[t]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
          Visível para a linha de gestão
        </label>
      </div>
      <textarea aria-label="Texto do registro" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-md border bg-background px-2 py-1" />
      <p className="text-xs text-muted-foreground">A alteração fica registrada no histórico de auditoria.</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={salvar} disabled={salvando || !texto.trim()}>
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  )
}
