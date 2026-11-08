// Edge Function processar-envios (inclusão de 08/11/2026): a régua de comunicação por e-mail.
// Chamada pelo agendador (pg_cron a cada 15 min, com o segredo de config_sistema). Job: usa
// service_role. Para cada lembrete de e-mail vencido monta o e-mail, grava em email_envio
// (a "caixa de saída", visível ao destinatário) e envia pelo provedor quando houver.
// Destinatário de demonstração nunca recebe (ver _shared/email/provedor.ts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { type DadosLembrete, emailDeLembrete } from '../_shared/email/modelos.ts'
import { decidirDestino, type ProvedorEmail, provedorDoAmbiente } from '../_shared/email/provedor.ts'
import { clienteDeServico, CORS, ehAgendador, responder, urlDoApp } from '../_shared/http.ts'
import type { Database } from '../_shared/tipos/banco.ts'

const env = (n: string) => Deno.env.get(n)
type Db = SupabaseClient<Database>

interface Usuario {
  email: string
  nome: string
  demo: boolean
}

async function usuario(servico: Db, cache: Map<string, Usuario | null>, id: string): Promise<Usuario | null> {
  if (cache.has(id)) return cache.get(id)!
  const { data } = await servico.auth.admin.getUserById(id)
  const u = data.user
  const r = u?.email ? { email: u.email, nome: String(u.user_metadata?.nome ?? u.email.split('@')[0]), demo: u.user_metadata?.demo === true } : null
  cache.set(id, r)
  return r
}

async function enviar(servico: Db, provedor: ProvedorEmail | null, de: string | null, emailId: string, para: string, assunto: string, html: string, texto: string) {
  if (!provedor || !de) return
  try {
    const r = await provedor.enviar({ para, de, assunto, html, texto })
    await servico.from('email_envio').update({ status: 'enviado', enviado_em: new Date().toISOString(), provedor_id: r.id, erro: null }).eq('id', emailId)
  } catch (e) {
    const { data } = await servico.from('email_envio').select('tentativas').eq('id', emailId).single()
    await servico.from('email_envio').update({ status: 'erro', tentativas: (data?.tentativas ?? 0) + 1, erro: String(e).slice(0, 500) }).eq('id', emailId)
  }
}

async function processar(servico: Db) {
  const { provedor, de, destinoTeste } = provedorDoAmbiente(env)
  const urlApp = await urlDoApp(servico)
  const usuarios = new Map<string, Usuario | null>()
  const contagem = { lembretes: 0, enviados: 0, na_caixa: 0, descartados: 0, reenvios: 0 }

  const { data: lembretes, error } = await servico
    .from('lembrete')
    .select(`id, empresa_id, destinatario_user_id, etapa,
      combinado:combinado_id(descricao, prazo, status, colaborador:colaborador_id(nome)),
      compromisso:compromisso_id(id, titulo, tipo, inicio, duracao_min, local, status, colaborador:colaborador_id(nome)),
      decisao:decisao_id(id, titulo, status, prazo_decisao, revisar_em)`)
    .eq('canal', 'email')
    .is('enviado_em', null)
    .lte('enviar_em', new Date().toISOString())
    .order('enviar_em')
    .limit(100)
  if (error) throw new Error(`ler lembretes: ${error.message}`)

  for (const l of lembretes ?? []) {
    contagem.lembretes++
    await servico.from('lembrete').update({ enviado_em: new Date().toISOString() }).eq('id', l.id)
    let origem: DadosLembrete['origem'] | null = null
    if (l.combinado && ['aberto', 'renegociado'].includes(l.combinado.status)) {
      origem = { tipo: 'combinado', descricao: l.combinado.descricao, prazo: l.combinado.prazo, pessoa: l.combinado.colaborador?.nome ?? null }
    } else if (l.compromisso && (l.compromisso.status === 'agendado')) {
      const c = l.compromisso
      origem = { tipo: 'compromisso', id: c.id, titulo: c.titulo, tipoCompromisso: c.tipo, inicio: c.inicio, duracaoMin: c.duracao_min, local: c.local, pessoa: c.colaborador?.nome ?? null }
    } else if (l.decisao && ['em_analise', 'decidida'].includes(l.decisao.status)) {
      origem = { tipo: 'decisao', id: l.decisao.id, titulo: l.decisao.titulo, prazo: l.decisao.prazo_decisao, revisarEm: l.decisao.revisar_em }
    }
    const u = await usuario(servico, usuarios, l.destinatario_user_id)
    if (!origem || !u) {
      contagem.descartados++
      continue
    }
    const email = emailDeLembrete({ etapa: l.etapa, nomeDestinatario: u.nome, urlApp, origem })
    const destino = decidirDestino({ para: u.email, destinatarioDemo: u.demo, temProvedor: Boolean(provedor), destinoTeste })
    const id = crypto.randomUUID()
    const assunto = destino.status === 'enviar' ? destino.assuntoPrefixo + email.assunto : email.assunto
    const ins = await servico.from('email_envio').insert({
      id, empresa_id: l.empresa_id, destinatario_user_id: l.destinatario_user_id, para: u.email, tipo: 'lembrete', etapa: l.etapa,
      assunto, html: email.html, texto: email.texto, lembrete_id: l.id,
      status: destino.status === 'enviar' ? 'pendente' : destino.status, erro: destino.status === 'enviar' ? null : destino.motivo,
    })
    if (ins.error) {
      console.error('email_envio:', ins.error.message)
      continue
    }
    if (destino.status === 'enviar') {
      await enviar(servico, provedor, de, id, destino.para, assunto, email.html, email.texto)
      contagem.enviados++
    } else contagem.na_caixa++
  }

  // Reenvio: o que ficou com erro ou esperando o provedor nos últimos 2 dias (até 3 tentativas).
  if (provedor) {
    const { data: pendentes } = await servico
      .from('email_envio')
      .select('id, destinatario_user_id, para, assunto, html, texto')
      .in('status', ['erro', 'aguardando_provedor', 'pendente'])
      .lt('tentativas', 3)
      .gte('criado_em', new Date(Date.now() - 2 * 86_400_000).toISOString())
      .limit(50)
    for (const p of pendentes ?? []) {
      const u = await usuario(servico, usuarios, p.destinatario_user_id)
      const destino = decidirDestino({ para: p.para, destinatarioDemo: u?.demo ?? true, temProvedor: true, destinoTeste })
      if (destino.status !== 'enviar') {
        await servico.from('email_envio').update({ status: destino.status, erro: destino.motivo }).eq('id', p.id)
        continue
      }
      const assunto = p.assunto.startsWith('[teste') ? p.assunto : destino.assuntoPrefixo + p.assunto
      await enviar(servico, provedor, de, p.id, destino.para, assunto, p.html, p.texto)
      contagem.reenvios++
    }
  }
  return contagem
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'Use POST' })
  try {
    const servico = clienteDeServico(env)
    if (!(await ehAgendador(req, servico))) return responder(401, { erro: 'Só o agendador chama esta função' })
    return responder(200, await processar(servico))
  } catch (erro) {
    console.error(erro)
    return responder(500, { erro: 'Erro ao processar envios' })
  }
})
