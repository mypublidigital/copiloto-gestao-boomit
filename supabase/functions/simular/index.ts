// Edge Function simular (M4). JWT do líder; o ensaio fica em `simulacao` (privado pela RLS).
//   acao "responder": próxima fala do interlocutor simulado, em streaming (SSE);
//   acao "debrief": rubrica com os cinco critérios, sem nota.
import { z } from 'zod'
import { carregarContextoDaPessoa } from '../_shared/adaptadores/boomit/carregar.ts'
import { clienteDoUsuario, CORS, ErroHttp, exigirEnv, registrarInteracao, responder } from '../_shared/http.ts'
import { ClienteAnthropic } from '../_shared/motor/anthropic.ts'
import type { Json } from '../_shared/tipos/banco.ts'
import { RecusaDoModeloError } from '../_shared/motor/modelo.ts'
import { gerarDebrief, INTENSIDADES, responderComoInterlocutor } from '../_shared/motor/simulacao.ts'

const env = (n: string) => Deno.env.get(n)

const corpoSchema = z.object({
  acao: z.enum(['responder', 'debrief']),
  situacao_id: z.uuid(),
  simulacao_id: z.uuid().nullable().default(null),
  intensidade: z.enum(INTENSIDADES as ['receptiva', 'moderada', 'desafiadora']),
  falas: z.array(z.object({ quem: z.enum(['lider', 'interlocutor']), texto: z.string().trim().min(1).max(2000) })).min(1).max(60),
})

async function tratar(req: Request): Promise<Response> {
  const { db, usuario } = await clienteDoUsuario(req, env)
  const corpo = corpoSchema.safeParse(await req.json().catch(() => null))
  if (!corpo.success) throw new ErroHttp(400, `Pedido inválido: ${corpo.error.issues[0]?.message ?? ''}`)
  const c = corpo.data

  const sit = await db.from('situacao').select('id, empresa_id, colaborador_id, autor_user_id, status, sensivel').eq('id', c.situacao_id).maybeSingle()
  if (!sit.data || sit.data.autor_user_id !== usuario.id) throw new ErroHttp(404, 'Situação não encontrada')
  if (sit.data.sensivel) throw new ErroHttp(409, 'Situação em modo encaminhamento: não há simulação')
  if (!sit.data.colaborador_id) throw new ErroHttp(400, 'Simulação de grupo ainda não disponível')
  const situacao = sit.data

  const contexto = await carregarContextoDaPessoa(db, situacao.colaborador_id!)
  if (!contexto) throw new ErroHttp(404, 'Esta pessoa não está na sua visão')
  const prep = await db.from('preparacao').select('conteudo').eq('situacao_id', situacao.id).order('versao', { ascending: false }).limit(1).maybeSingle()
  const resumoPlano = (prep.data?.conteudo as { plano?: { resumo_situacao?: string } } | null)?.plano?.resumo_situacao ?? null

  const cliente = new ClienteAnthropic(exigirEnv('ANTHROPIC_API_KEY', env))
  const modelo = exigirEnv('MODELO_PRINCIPAL', env)
  const nome = contexto.pessoa.nome.split(' ')[0] ?? contexto.pessoa.nome

  if (c.acao === 'debrief') {
    if (!c.simulacao_id) throw new ErroHttp(400, 'Faça o ensaio antes do debrief')
    const r = await gerarDebrief({ nomeInterlocutor: nome, intensidade: c.intensidade, resumoPlano, falas: c.falas, cliente, modelo })
    const up = await db.from('simulacao').update({ debrief: r.debrief as unknown as Json, mensagens: c.falas as unknown as Json }).eq('id', c.simulacao_id)
    if (up.error) throw new ErroHttp(500, `Não foi possível salvar o debrief: ${up.error.message}`)
    await registrarInteracao(db, { empresa_id: situacao.empresa_id, situacao_id: situacao.id, finalidade: 'debrief', versao_prompt: r.versao_prompt, uso: r.uso, fontes_ids: [] })
    return responder(200, { simulacao_id: c.simulacao_id, debrief: r.debrief })
  }

  // Streaming: cada trecho vai como evento SSE; no fim, grava o ensaio e manda o id.
  const codificador = new TextEncoder()
  const corpoStream = new ReadableStream<Uint8Array>({
    async start(controle) {
      const enviar = (evento: unknown) => controle.enqueue(codificador.encode(`data: ${JSON.stringify(evento)}\n\n`))
      try {
        const r = await responderComoInterlocutor({
          nomeInterlocutor: nome,
          intensidade: c.intensidade,
          itens: contexto.itens,
          resumoPlano,
          falas: c.falas,
          cliente,
          modelo,
          aoTexto: (t) => enviar({ t }),
        })
        const mensagens = [...c.falas, { quem: 'interlocutor' as const, texto: r.texto }] as unknown as Json
        let simulacaoId = c.simulacao_id
        if (simulacaoId) {
          const up = await db.from('simulacao').update({ mensagens }).eq('id', simulacaoId)
          if (up.error) throw new Error(up.error.message)
        } else {
          const nova = await db.from('simulacao').insert({ situacao_id: situacao.id, empresa_id: situacao.empresa_id, intensidade: c.intensidade, mensagens }).select('id').single()
          if (nova.error) throw new Error(nova.error.message)
          simulacaoId = nova.data.id
          if (situacao.status === 'preparada') await db.from('situacao').update({ status: 'simulada' }).eq('id', situacao.id)
        }
        await registrarInteracao(db, { empresa_id: situacao.empresa_id, situacao_id: situacao.id, finalidade: 'simulacao', versao_prompt: r.versao_prompt, uso: r.uso, fontes_ids: [] })
        enviar({ fim: true, simulacao_id: simulacaoId })
      } catch (erro) {
        enviar({ erro: erro instanceof RecusaDoModeloError ? 'O modelo não continuou este ensaio. Reformule a sua fala.' : 'Erro ao gerar a resposta do ensaio' })
        console.error(erro)
      } finally {
        controle.close()
      }
    },
  })
  return new Response(corpoStream, { headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'Use POST' })
  try {
    return await tratar(req)
  } catch (erro) {
    if (erro instanceof ErroHttp) return responder(erro.status, { erro: erro.message })
    if (erro instanceof RecusaDoModeloError) return responder(422, { erro: 'O modelo não conseguiu gerar o debrief deste ensaio.' })
    console.error(erro)
    return responder(500, { erro: 'Erro inesperado na simulação' })
  }
})
