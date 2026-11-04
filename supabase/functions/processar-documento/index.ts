// Edge Function processar-documento (Sprint 4, M6). Fila assíncrona sem tempo de requisição:
// confere com o JWT de quem chamou que o documento é dele, responde 202 e processa em segundo
// plano (EdgeRuntime.waitUntil) com service role — permitido para processamento de documentos.
// Passos: baixar do bucket privado → extrair texto → detectar formato → trechos → pessoas
// sugeridas (não confirmadas) → extração com MODELO_RAPIDO → extracao pendente → status.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { dividirEmTrechos, detectarFormato, extrairTexto, formatoDoArquivo, sugerirPessoas } from '../_shared/documentos/texto.ts'
import { clienteDoUsuario, CORS, ErroHttp, exigirEnv, responder } from '../_shared/http.ts'
import { ClienteAnthropic } from '../_shared/motor/anthropic.ts'
import { extrairDeTrechos } from '../_shared/motor/extracao.ts'
import { estimarCusto } from '../_shared/motor/modelo.ts'
import type { Database, Json } from '../_shared/tipos/banco.ts'

const env = (n: string) => Deno.env.get(n)
type Db = SupabaseClient<Database>

const corpoSchema = z.object({ documento_id: z.uuid() })

async function processar(servico: Db, documentoId: string): Promise<void> {
  const falhar = async (mensagem: string) => {
    await servico.from('documento_fonte').update({ status_processamento: 'erro', erro: mensagem.slice(0, 500) }).eq('id', documentoId)
  }
  try {
    const { data: doc, error } = await servico.from('documento_fonte').select('*').eq('id', documentoId).single()
    if (error || !doc) throw new Error(error?.message ?? 'documento não encontrado')
    if (!doc.storage_path) throw new Error('documento sem arquivo')
    const formatoArquivo = formatoDoArquivo(doc.storage_path)
    if (!formatoArquivo) throw new Error('formato de arquivo não aceito (use .txt, .md, .vtt, .docx ou .pdf)')

    await servico.from('documento_fonte').update({ status_processamento: 'processando', erro: null }).eq('id', documentoId)
    // Reprocessamento: limpa trechos e extrações anteriores (extração cai em cascata).
    await servico.from('trecho').delete().eq('documento_id', documentoId)

    const arquivo = await servico.storage.from('fontes').download(doc.storage_path)
    if (arquivo.error || !arquivo.data) throw new Error(`não foi possível ler o arquivo: ${arquivo.error?.message ?? ''}`)
    const texto = await extrairTexto(new Uint8Array(await arquivo.data.arrayBuffer()), formatoArquivo)
    if (!texto) throw new Error('o arquivo não tem texto legível')
    const formato = detectarFormato(texto)
    const brutos = dividirEmTrechos(texto, formato)

    const trechos = await servico
      .from('trecho')
      .insert(brutos.map((t) => ({ documento_id: documentoId, empresa_id: doc.empresa_id, ordem: t.ordem, locutor: t.locutor, inicio_seg: t.inicio_seg, texto: t.texto })))
      .select('id, ordem, texto, locutor')
    if (trechos.error) throw new Error(`gravar trechos: ${trechos.error.message}`)
    const ordenados = [...(trechos.data ?? [])].sort((a, b) => a.ordem - b.ordem)

    // Pessoas citadas, entre as da linha do líder (sugestão; o líder confirma na revisão).
    if (doc.lider_id) {
      const { data: vinculos } = await servico.from('vinculo_lideranca').select('liderado_id').eq('lider_id', doc.lider_id).is('fim', null)
      const ids = (vinculos ?? []).map((v) => v.liderado_id)
      if (ids.length) {
        const { data: pessoas } = await servico.from('colaborador').select('id, nome').in('id', ids)
        const sugeridas = sugerirPessoas(texto, pessoas ?? [])
        const { data: jaVinculadas } = await servico.from('documento_colaborador').select('colaborador_id').eq('documento_id', documentoId)
        const ja = new Set((jaVinculadas ?? []).map((v) => v.colaborador_id))
        const novas = sugeridas.filter((id) => !ja.has(id)).map((colaborador_id) => ({ documento_id: documentoId, colaborador_id, confirmado: false }))
        if (novas.length) await servico.from('documento_colaborador').insert(novas)
      }
    }

    const r = await extrairDeTrechos({
      trechos: ordenados.map((t) => ({ id: t.id, texto: t.texto, locutor: t.locutor })),
      dataEvento: doc.data_evento,
      formato,
      cliente: new ClienteAnthropic(exigirEnv('ANTHROPIC_API_KEY', env)),
      modelo: exigirEnv('MODELO_RAPIDO', env),
    })
    if (r.itens.length) {
      const ins = await servico.from('extracao').insert(
        r.itens.map((i) => ({
          documento_id: documentoId,
          empresa_id: doc.empresa_id,
          trecho_id: i.trecho_id,
          tipo: i.tipo,
          confianca: i.confianca,
          conteudo: { descricao: i.descricao, responsavel_nome: i.responsavel_nome, prazo: i.prazo, prazo_origem: i.prazo_origem } as Json,
        })),
      )
      if (ins.error) throw new Error(`gravar extrações: ${ins.error.message}`)
    }
    if (r.uso) {
      // Só metadados (CLAUDE.md): modelo, tokens, custo, trechos usados.
      await servico.from('interacao_ia').insert({
        empresa_id: doc.empresa_id,
        user_id: doc.enviado_por,
        finalidade: 'extracao',
        versao_prompt: r.versao_prompt,
        modelo: r.uso.modelo,
        fontes_ids: ordenados.map((t) => t.id),
        tokens_entrada: r.uso.tokens_entrada + r.uso.cache_leitura + r.uso.cache_escrita,
        tokens_saida: r.uso.tokens_saida,
        custo_estimado: estimarCusto(r.uso),
        latencia_ms: r.uso.latencia_ms,
      })
    }
    await servico.from('documento_fonte').update({ status_processamento: 'processado', formato: formato === 'texto' ? formatoArquivo : formato, erro: null }).eq('id', documentoId)
  } catch (erro) {
    console.error(erro)
    await falhar(erro instanceof Error ? erro.message : String(erro))
  }
}

async function tratar(req: Request): Promise<Response> {
  const { db, usuario } = await clienteDoUsuario(req, env)
  const corpo = corpoSchema.safeParse(await req.json().catch(() => null))
  if (!corpo.success) throw new ErroHttp(400, 'Pedido inválido: documento_id')
  // Com o JWT do usuário: a RLS só mostra documentos que ele pode ver.
  const { data: doc } = await db.from('documento_fonte').select('id, enviado_por, status_processamento').eq('id', corpo.data.documento_id).maybeSingle()
  if (!doc || doc.enviado_por !== usuario.id) throw new ErroHttp(404, 'Documento não encontrado')
  if (doc.status_processamento === 'processando') return responder(202, { documento_id: doc.id, status: 'processando' })

  const servico = createClient<Database>(exigirEnv('SUPABASE_URL', env), exigirEnv('SUPABASE_SERVICE_ROLE_KEY', env), { auth: { persistSession: false } })
  EdgeRuntime.waitUntil(processar(servico, doc.id))
  return responder(202, { documento_id: doc.id, status: 'processando' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'Use POST' })
  try {
    return await tratar(req)
  } catch (erro) {
    if (erro instanceof ErroHttp) return responder(erro.status, { erro: erro.message })
    console.error(erro)
    return responder(500, { erro: 'Erro inesperado ao processar o documento' })
  }
})
