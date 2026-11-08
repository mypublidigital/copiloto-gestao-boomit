// Edge Function insights-semanais (inclusão de 08/11/2026). Duas formas de chamar:
//   - agendador (pg_cron, segundas 7h de São Paulo, com o segredo): job com service_role, para
//     cada líder lê SÓ os registros criados por ele (mesma regra de privacidade da RLS);
//   - o próprio líder (JWT), pelo botão "Gerar agora": lê com o JWT dele (RLS).
// Agentes (regras) levantam os sinais → motor redige e prioriza → verificação → grava em
// insight_semanal e põe o e-mail na fila (email_envio). Sem modelo, o resumo sai só das regras.
import type { SupabaseClient } from '@supabase/supabase-js'
import { fatosDaSemana, lerSemana, type Semana } from '../_shared/agentes/semana.ts'
import { emailDeInsights } from '../_shared/email/modelos.ts'
import { decidirDestino, provedorDoAmbiente } from '../_shared/email/provedor.ts'
import { clienteDeServico, clienteDoUsuario, CORS, ehAgendador, ErroHttp, registrarInteracao, responder, urlDoApp } from '../_shared/http.ts'
import { ClienteAnthropic } from '../_shared/motor/anthropic.ts'
import { gerarInsights, insightsDeterministicos, type InsightsVerificados } from '../_shared/motor/insights.ts'
import type { Database, Json } from '../_shared/tipos/banco.ts'

const env = (n: string) => Deno.env.get(n)
type Db = SupabaseClient<Database>

interface Lider {
  user_id: string
  empresa_id: string
  colaborador_id: string
}

/** Segunda-feira da semana corrente em São Paulo (AAAA-MM-DD). */
function segundaDaSemana(agora: Date): string {
  const sp = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const diasDesdeSegunda = (sp.getDay() + 6) % 7
  sp.setDate(sp.getDate() - diasDesdeSegunda)
  return `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, '0')}-${String(sp.getDate()).padStart(2, '0')}`
}

async function lerSemanaDoLider(db: Db, l: Lider, agora: Date): Promise<{ semana: Semana; proximos: { titulo: string; inicio: string }[] }> {
  const desde = new Date(agora.getTime() - 60 * 86_400_000).toISOString()
  const ate = new Date(agora.getTime() + 8 * 86_400_000).toISOString()
  const [vinculos, compromissos, combinados, decisoes, docs] = await Promise.all([
    db.from('vinculo_lideranca').select('liderado:liderado_id(id, nome)').eq('lider_id', l.colaborador_id).is('fim', null),
    db.from('compromisso').select('id, titulo, tipo, inicio, status, colaborador_id, realizado_em').eq('criado_por', l.user_id).gte('inicio', desde).lte('inicio', ate).neq('status', 'cancelado'),
    db.from('combinado').select('id, descricao, prazo, status, colaborador_id, concluido_em').eq('criado_por', l.user_id).in('status', ['aberto', 'renegociado', 'cumprido']),
    db.from('decisao').select('id, titulo, status, prazo_decisao, revisar_em, decidida_em, versao_analise').eq('criado_por', l.user_id).in('status', ['em_analise', 'decidida']),
    db.from('documento_fonte').select('id').eq('enviado_por', l.user_id),
  ])
  for (const r of [vinculos, compromissos, combinados, decisoes, docs]) if (r.error) throw new Error(`ler semana: ${r.error.message}`)
  const docIds = (docs.data ?? []).map((d) => d.id)
  const pendentes = docIds.length
    ? await db.from('extracao').select('id', { count: 'exact', head: true }).in('documento_id', docIds).eq('tipo', 'combinado').eq('status_revisao', 'pendente')
    : { count: 0 }
  const equipe = (vinculos.data ?? []).map((v) => v.liderado).filter((p): p is { id: string; nome: string } => Boolean(p))
  return {
    semana: {
      agora,
      equipe,
      compromissos: compromissos.data ?? [],
      combinados: combinados.data ?? [],
      decisoes: decisoes.data ?? [],
      revisoesPendentes: pendentes.count ?? 0,
    },
    proximos: (compromissos.data ?? [])
      .filter((c) => c.status === 'agendado' && new Date(c.inicio) >= agora)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 8)
      .map((c) => ({ titulo: c.titulo, inicio: c.inicio })),
  }
}

async function gerarParaLider(leitura: Db, servico: Db, l: Lider, opcoes: { enviarEmail: boolean }): Promise<{ insights: InsightsVerificados; semana_inicio: string }> {
  const agora = new Date()
  const semanaInicio = segundaDaSemana(agora)
  const { semana, proximos } = await lerSemanaDoLider(leitura, l, agora)
  const sinais = lerSemana(semana)
  const fatos = fatosDaSemana(semana)

  let insights: InsightsVerificados
  let modelo: string | null = null
  const chave = env('ANTHROPIC_API_KEY')
  const nomeModelo = env('MODELO_PRINCIPAL')
  try {
    if (!chave || !nomeModelo) throw new Error('modelo não configurado')
    const r = await gerarInsights({ sinais, fatos, cliente: new ClienteAnthropic(chave), modelo: nomeModelo })
    insights = r.insights
    modelo = r.uso?.modelo ?? nomeModelo
    if (r.uso) await registrarInteracao(servico, { empresa_id: l.empresa_id, situacao_id: null, finalidade: 'insights_semanais', versao_prompt: r.versao_prompt, uso: r.uso, fontes_ids: r.fontes_ids })
  } catch (e) {
    console.error('insights pelo modelo falharam, usando regras:', String(e))
    insights = insightsDeterministicos(sinais, fatos)
  }

  const gravado = await servico
    .from('insight_semanal')
    .upsert(
      { empresa_id: l.empresa_id, lider_id: l.colaborador_id, destinatario_user_id: l.user_id, semana_inicio: semanaInicio, conteudo: insights as unknown as Json, modelo, gerado_em: new Date().toISOString() },
      { onConflict: 'destinatario_user_id,semana_inicio' },
    )
  if (gravado.error) throw new Error(`gravar insight: ${gravado.error.message}`)

  if (opcoes.enviarEmail) {
    const { data } = await servico.auth.admin.getUserById(l.user_id)
    const u = data.user
    if (u?.email) {
      const nome = String(u.user_metadata?.nome ?? u.email.split('@')[0])
      const email = emailDeInsights({ nomeDestinatario: nome, semanaInicio, insights, urlApp: await urlDoApp(servico), proximos })
      const { provedor, de, destinoTeste } = provedorDoAmbiente(env)
      const destino = decidirDestino({ para: u.email, destinatarioDemo: u.user_metadata?.demo === true, temProvedor: Boolean(provedor), destinoTeste })
      const id = crypto.randomUUID()
      const assunto = destino.status === 'enviar' ? destino.assuntoPrefixo + email.assunto : email.assunto
      await servico.from('email_envio').insert({
        id, empresa_id: l.empresa_id, destinatario_user_id: l.user_id, para: u.email, tipo: 'insights_semanais', etapa: semanaInicio,
        assunto, html: email.html, texto: email.texto, status: destino.status === 'enviar' ? 'pendente' : destino.status, erro: destino.status === 'enviar' ? null : destino.motivo,
      })
      if (destino.status === 'enviar' && provedor && de) {
        try {
          const r = await provedor.enviar({ para: destino.para, de, assunto, html: email.html, texto: email.texto })
          await servico.from('email_envio').update({ status: 'enviado', enviado_em: new Date().toISOString(), provedor_id: r.id }).eq('id', id)
        } catch (e) {
          await servico.from('email_envio').update({ status: 'erro', tentativas: 1, erro: String(e).slice(0, 500) }).eq('id', id)
        }
      }
    }
  }
  return { insights, semana_inicio: semanaInicio }
}

async function tratar(req: Request): Promise<Response> {
  const servico = clienteDeServico(env)
  if (await ehAgendador(req, servico)) {
    const { data: lideres, error } = await servico.from('membro').select('user_id, empresa_id, colaborador_id').eq('papel', 'lider').not('colaborador_id', 'is', null)
    if (error) throw new Error(error.message)
    let gerados = 0
    for (const l of lideres ?? []) {
      try {
        await gerarParaLider(servico, servico, l as Lider, { enviarEmail: true })
        gerados++
      } catch (e) {
        console.error(`insights de ${l.user_id}:`, String(e))
      }
    }
    return responder(200, { gerados })
  }

  // O próprio líder pede os insights da semana (e, se quiser, o e-mail).
  const { db, usuario } = await clienteDoUsuario(req, env)
  const corpo = (await req.json().catch(() => ({}))) as { enviar_email?: boolean }
  const { data: membro } = await db.from('membro').select('user_id, empresa_id, colaborador_id').eq('user_id', usuario.id).eq('papel', 'lider').limit(1).maybeSingle()
  if (!membro?.colaborador_id) throw new ErroHttp(403, 'Só líderes têm insights semanais')
  const r = await gerarParaLider(db, servico, membro as Lider, { enviarEmail: corpo.enviar_email === true })
  return responder(200, r)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder(405, { erro: 'Use POST' })
  try {
    return await tratar(req)
  } catch (erro) {
    if (erro instanceof ErroHttp) return responder(erro.status, { erro: erro.message })
    console.error(erro)
    return responder(500, { erro: 'Erro ao gerar os insights da semana' })
  }
})
