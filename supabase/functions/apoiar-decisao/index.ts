// Edge Function apoiar-decisao (inclusão de 08/11/2026). Roda com o JWT do líder: a decisão e o
// contexto (alçadas, organização, pessoa afetada) passam pela RLS. Gera a análise com o modelo
// principal, verifica no motor e grava em decisao.analise (nova versão). interacao_ia: só metadados.
import { z } from 'zod'
import { carregarContextoDaDecisao } from '../_shared/adaptadores/boomit/carregar.ts'
import { clienteDoUsuario, CORS, ErroHttp, exigirCotaDeIA, exigirEnv, registrarInteracao, responder } from '../_shared/http.ts'
import { ClienteAnthropic } from '../_shared/motor/anthropic.ts'
import { apoiarDecisao } from '../_shared/motor/decisao.ts'
import { RecusaDoModeloError, SaidaInvalidaError } from '../_shared/motor/modelo.ts'
import type { Json } from '../_shared/tipos/banco.ts'

const env = (n: string) => Deno.env.get(n)
const corpoSchema = z.object({ decisao_id: z.uuid() })

async function tratar(req: Request): Promise<Response> {
  const { db, usuario } = await clienteDoUsuario(req, env)
  await exigirCotaDeIA(db, usuario.id, env)
  const corpo = corpoSchema.safeParse(await req.json().catch(() => null))
  if (!corpo.success) throw new ErroHttp(400, 'Pedido inválido')

  const { data: d, error } = await db.from('decisao').select('*').eq('id', corpo.data.decisao_id).maybeSingle()
  if (error) throw new ErroHttp(500, error.message)
  if (!d) throw new ErroHttp(404, 'Decisão não encontrada')
  if (d.status !== 'em_analise') throw new ErroHttp(409, 'Esta decisão já foi registrada')

  const itens = await carregarContextoDaDecisao(db, d.empresa_id, d.lider_id, d.colaborador_id)
  const r = await apoiarDecisao({
    titulo: d.titulo,
    pergunta: d.pergunta,
    contexto: d.contexto,
    opcoes: d.opcoes_iniciais,
    prazo: d.prazo_decisao,
    itens,
    cliente: new ClienteAnthropic(exigirEnv('ANTHROPIC_API_KEY', env)),
    modelo: exigirEnv('MODELO_PRINCIPAL', env),
  })
  if (r.uso) await registrarInteracao(db, { empresa_id: d.empresa_id, situacao_id: null, finalidade: 'apoio_decisao', versao_prompt: r.versao_prompt, uso: r.uso, fontes_ids: r.fontes_ids })

  const analise =
    r.tipo === 'encaminhamento'
      ? { tipo: 'encaminhamento', motivo: r.motivo }
      : { tipo: 'analise', ...r.analise, alertas: r.alertas, gerada_em: new Date().toISOString() }
  if (r.tipo === 'encaminhamento') {
    const { data: empresa } = await db.from('empresa').select('config').eq('id', d.empresa_id).maybeSingle()
    Object.assign(analise, { canais: ((empresa?.config ?? {}) as { canais_encaminhamento?: Record<string, string> }).canais_encaminhamento ?? {} })
  }
  const up = await db
    .from('decisao')
    .update({ analise: analise as unknown as Json, versao_analise: d.versao_analise + 1, sensivel: r.tipo === 'encaminhamento' })
    .eq('id', d.id)
  if (up.error) throw new ErroHttp(500, `Não foi possível salvar a análise: ${up.error.message}`)
  return responder(200, { analise, versao_analise: d.versao_analise + 1 })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'Use POST' })
  try {
    return await tratar(req)
  } catch (erro) {
    if (erro instanceof ErroHttp) return responder(erro.status, { erro: erro.message })
    if (erro instanceof RecusaDoModeloError) return responder(422, { erro: 'O modelo não conseguiu analisar esta decisão. Reformule a pergunta ou fale com o RH.' })
    if (erro instanceof SaidaInvalidaError) return responder(502, { erro: 'A resposta da IA veio fora do formato esperado. Tente de novo.' })
    console.error(erro)
    return responder(500, { erro: 'Erro inesperado ao analisar a decisão' })
  }
})
