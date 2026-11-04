// Edge Function preparar-situacao (M3). Roda com o JWT do líder: a RLS filtra o contexto.
//   acao "contexto": devolve as fontes que entrariam no plano (o líder pode desmarcar);
//   acao "gerar": classificação → [encaminhamento] → plano verificado; grava situacao,
//                 preparacao (versão 1) e interacao_ia (só metadados).
import { z } from 'zod'
import { carregarContextoDaPessoa } from '../_shared/adaptadores/boomit/carregar.ts'
import { clienteDoUsuario, CORS, ErroHttp, exigirEnv, registrarInteracao, responder } from '../_shared/http.ts'
import { ClienteAnthropic } from '../_shared/motor/anthropic.ts'
import { RecusaDoModeloError, SaidaInvalidaError } from '../_shared/motor/modelo.ts'
import { prepararSituacao } from '../_shared/motor/preparar.ts'
import { TIPOS_PREPARACAO } from '../_shared/motor/saida.ts'
import type { Json } from '../_shared/tipos/banco.ts'

const env = (n: string) => Deno.env.get(n)

const corpoSchema = z.object({
  acao: z.enum(['contexto', 'gerar']),
  colaborador_id: z.uuid(),
  tipo: z.enum(TIPOS_PREPARACAO),
  relato: z.string().trim().max(4000).default(''),
  fontes_excluidas: z.array(z.string()).max(200).default([]),
})

const titulo = (relato: string) => {
  const t = relato.replace(/\s+/g, ' ').trim()
  return t.length > 70 ? `${t.slice(0, 67)}…` : t
}

async function tratar(req: Request): Promise<Response> {
  const { db, usuario } = await clienteDoUsuario(req, env)
  const corpo = corpoSchema.safeParse(await req.json().catch(() => null))
  if (!corpo.success) throw new ErroHttp(400, `Pedido inválido: ${corpo.error.issues[0]?.message ?? ''}`)
  const c = corpo.data

  const { data: membro } = await db.from('membro').select('empresa_id, colaborador_id').eq('user_id', usuario.id).eq('papel', 'lider').limit(1).maybeSingle()
  if (!membro?.colaborador_id) throw new ErroHttp(403, 'Só líderes preparam conversas')

  const contexto = await carregarContextoDaPessoa(db, c.colaborador_id, membro.colaborador_id, c.relato || null)
  if (!contexto) throw new ErroHttp(404, 'Esta pessoa não está na sua visão')
  const excluidas = new Set(c.fontes_excluidas)
  const itens = contexto.itens.filter((i) => !excluidas.has(i.fonte_id))

  if (c.acao === 'contexto') {
    return responder(200, { pessoa: contexto.pessoa, fontes: contexto.itens })
  }
  if (c.relato.length < 10) throw new ErroHttp(400, 'Escreva um relato com pelo menos uma frase')

  const cliente = new ClienteAnthropic(exigirEnv('ANTHROPIC_API_KEY', env))
  const modelos = { principal: exigirEnv('MODELO_PRINCIPAL', env), rapido: exigirEnv('MODELO_RAPIDO', env) }
  const resultado = await prepararSituacao({ tipo: c.tipo, relato: c.relato, itens, cliente, modelos })
  const sensivel = resultado.tipo === 'encaminhamento'

  // Id gerado aqui e insert sem RETURNING: a política de leitura de situacao consulta a própria
  // tabela e, no mesmo comando, ainda não enxerga a linha nova (o RETURNING seria recusado).
  const situacaoId = crypto.randomUUID()
  const situacao = await db
    .from('situacao')
    .insert({
      id: situacaoId,
      empresa_id: membro.empresa_id,
      lider_id: membro.colaborador_id,
      colaborador_id: c.colaborador_id,
      tipo: c.tipo,
      frente: sensivel ? 'crises' : resultado.classificacao.frente,
      titulo: titulo(c.relato),
      relato_inicial: c.relato,
      status: sensivel ? 'encaminhada' : 'preparada',
      sensivel,
    })
  if (situacao.error) throw new ErroHttp(500, `Não foi possível salvar a situação: ${situacao.error.message}`)

  let interacaoPreparacao: string | null = null
  for (const ch of resultado.chamadas) {
    const id = await registrarInteracao(db, { empresa_id: membro.empresa_id, situacao_id: situacaoId, finalidade: ch.finalidade, versao_prompt: ch.versao_prompt, uso: ch.uso, fontes_ids: ch.fontes_ids })
    if (ch.finalidade === 'preparacao') interacaoPreparacao = id
  }

  if (resultado.tipo === 'encaminhamento') {
    const { data: empresa } = await db.from('empresa').select('config').eq('id', membro.empresa_id).maybeSingle()
    const config = (empresa?.config ?? {}) as { canais_encaminhamento?: Record<string, string> }
    return responder(200, { situacao_id: situacaoId, tipo: 'encaminhamento', motivo: resultado.motivo, categoria: resultado.categoria, canais: config.canais_encaminhamento ?? {} })
  }

  const fontes = [...resultado.pacote.fontes.values()].map(({ apelido, fonte_id, rotulo, camada, conteudo, data }) => ({ apelido, fonte_id, rotulo, camada, conteudo, data }))
  const conteudo = { tipo: c.tipo, plano: resultado.plano, alertas: resultado.alertas, fontes, informacoes_faltantes: resultado.classificacao.informacoes_faltantes }
  const prep = await db
    .from('preparacao')
    .insert({ situacao_id: situacaoId, empresa_id: membro.empresa_id, versao: 1, conteudo: conteudo as unknown as Json, gerado_por: 'ia', interacao_ia_id: interacaoPreparacao })
    .select('versao')
    .single()
  if (prep.error) throw new ErroHttp(500, `Não foi possível salvar a preparação: ${prep.error.message}`)

  return responder(200, { ...conteudo, situacao_id: situacaoId, tipo: 'plano', tipo_situacao: c.tipo, versao: prep.data.versao })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'Use POST' })
  try {
    return await tratar(req)
  } catch (erro) {
    if (erro instanceof ErroHttp) return responder(erro.status, { erro: erro.message })
    if (erro instanceof RecusaDoModeloError) return responder(422, { erro: 'O modelo não conseguiu preparar esta situação. Reformule o relato ou fale com o RH.' })
    if (erro instanceof SaidaInvalidaError) return responder(502, { erro: 'A resposta da IA veio fora do formato esperado. Tente de novo.' })
    console.error(erro)
    return responder(500, { erro: 'Erro inesperado ao preparar a conversa' })
  }
})
