#!/usr/bin/env node
// Seed de demonstração (só dados fictícios). Idempotente: pode rodar quantas vezes quiser.
//   1. Conector Boomit em modo mock (mesmo código da Edge Function conector-boomit)
//   2. Hierarquia de fixtures/boomit/hierarquia-exemplo.csv → vinculo_lideranca
//   3. Usuários das personas (src/demo/personas.ts), papéis (membro) e mentoria
// Uso: npm run seed:demo   (carrega o .env.local sem exibir; usa SUPABASE_SERVICE_ROLE_KEY)
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../supabase/functions/_shared/tipos/banco.ts'
import { FonteMock } from '../supabase/functions/_shared/adaptadores/boomit/fonte.ts'
import { sincronizar } from '../supabase/functions/_shared/adaptadores/boomit/sincronizar.ts'
import { PERSONAS } from '../src/demo/personas.ts'

const RAIZ = path.resolve(import.meta.dirname, '..')
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_DEMO_SENHA, VITE_MODO_DEMO } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
if (!VITE_DEMO_SENHA) throw new Error('Falta VITE_DEMO_SENHA no .env.local')
if (VITE_MODO_DEMO !== 'true') throw new Error('Seed de demonstração só roda com VITE_MODO_DEMO=true')

const db = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function exigir<T>(r: { data: T; error: { message: string } | null }, contexto: string): T {
  if (r.error) throw new Error(`${contexto}: ${r.error.message}`)
  return r.data
}

// 1. Conector
const resumo = await sincronizar(db, new FonteMock())
console.log(`Conector (mock): ${resumo.status} · ${resumo.registros_lidos} colaboradores · ${resumo.snapshots_novos} snapshots novos · ${resumo.alertas} alertas`)
if (resumo.erros.length) console.log(`  erros: ${resumo.erros.join(' | ')}`)
const empresaId = resumo.empresa_id

// Canais de encaminhamento fictícios (modo encaminhamento, docs/03 §8). Os reais vêm do RH (N18).
const empresa = exigir(await db.from('empresa').select('config').eq('id', empresaId).single(), 'ler empresa')
const config = { ...((empresa.config ?? {}) as Record<string, unknown>) }
config.canais_encaminhamento = {
  rh: 'RH da Exemplo Tech (fictício) · pessoas@exemplotech.com',
  juridico: 'Jurídico da Exemplo Tech (fictício) · juridico@exemplotech.com',
  etica: 'Canal de ética da Exemplo Tech (fictício) · formulário anônimo na intranet',
}
exigir(await db.from('empresa').update({ config: config as Json }).eq('id', empresaId), 'gravar canais de encaminhamento')

// Alçadas fictícias (Sprint 3, decisão na alçada). As reais vêm do RH da EasyJur (N12).
const alcadasExistentes = exigir(await db.from('alcada').select('id').eq('empresa_id', empresaId), 'ler alçadas')
if (alcadasExistentes.length === 0) {
  exigir(
    await db.from('alcada').insert([
      {
        empresa_id: empresaId,
        nivel: 'tatico',
        cargo_referencia: 'Coordenação (exemplo fictício)',
        pode_decidir: 'ajustar escala, folgas e trocas de turno de até 2 dias; redistribuir demandas na equipe; aprovar treinamentos internos sem custo; definir prioridades da semana.',
        limites: 'não inclui contratação, desligamento, mudança de cargo ou salário, nem despesas acima de R$ 1.000.',
        consultar: 'diretor da área e RH.',
      },
      {
        empresa_id: empresaId,
        nivel: 'estrategico',
        cargo_referencia: 'Diretoria (exemplo fictício)',
        pode_decidir: 'aprovar contratações previstas no orçamento, promoções dentro da faixa salarial e despesas de até R$ 20.000.',
        limites: 'desligamentos e mudanças fora da política salarial passam pelo RH.',
        consultar: 'RH e diretoria executiva.',
      },
    ]),
    'gravar alçadas',
  )
  console.log('Alçadas fictícias gravadas (2)')
}

const colaboradores = exigir(await db.from('colaborador').select('id, email').eq('empresa_id', empresaId), 'ler colaboradores')
const idPorEmail = new Map(colaboradores.map((c) => [c.email.toLowerCase(), c.id]))
const idDe = (email: string) => {
  const id = idPorEmail.get(email.toLowerCase())
  if (!id) throw new Error(`Colaborador ${email} não está no fixture`)
  return id
}

// 2. Hierarquia
const linhas = readFileSync(path.join(RAIZ, 'fixtures/boomit/hierarquia-exemplo.csv'), 'utf8').trim().split(/\r?\n/).slice(1)
const ativos = exigir(await db.from('vinculo_lideranca').select('lider_id, liderado_id').eq('empresa_id', empresaId).is('fim', null), 'ler hierarquia')
const atual = new Map(ativos.map((v) => [v.liderado_id, v.lider_id]))
let vinculosNovos = 0
for (const linha of linhas) {
  const [liderado, lider] = linha.split(',').map((s) => s.trim())
  if (!liderado || !lider) continue
  const lideradoId = idDe(liderado)
  const liderId = idDe(lider)
  if (atual.get(lideradoId) === liderId) continue
  if (atual.has(lideradoId)) {
    exigir(await db.from('vinculo_lideranca').update({ fim: new Date().toISOString().slice(0, 10) }).eq('liderado_id', lideradoId).is('fim', null), 'encerrar vínculo antigo')
  }
  exigir(await db.from('vinculo_lideranca').insert({ empresa_id: empresaId, lider_id: liderId, liderado_id: lideradoId }), `vincular ${liderado}`)
  vinculosNovos++
}
console.log(`Hierarquia: ${linhas.length} vínculos no CSV, ${vinculosNovos} gravados agora`)

// 3. Usuários, papéis e mentoria
const existentes = new Map<string, string>()
for (let pagina = 1; ; pagina++) {
  const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 })
  if (error) throw new Error(`listar usuários: ${error.message}`)
  for (const u of data.users) if (u.email) existentes.set(u.email.toLowerCase(), u.id)
  if (data.users.length < 200) break
}

for (const p of PERSONAS) {
  let userId = existentes.get(p.email)
  if (userId) {
    const r = await db.auth.admin.updateUserById(userId, { password: VITE_DEMO_SENHA, user_metadata: { nome: p.nome, demo: true } })
    if (r.error) throw new Error(`atualizar ${p.email}: ${r.error.message}`)
  } else {
    const r = await db.auth.admin.createUser({ email: p.email, password: VITE_DEMO_SENHA, email_confirm: true, user_metadata: { nome: p.nome, demo: true } })
    if (r.error || !r.data.user) throw new Error(`criar ${p.email}: ${r.error?.message}`)
    userId = r.data.user.id
  }
  exigir(
    await db.from('membro').upsert(
      { user_id: userId, empresa_id: empresaId, papel: p.papel, colaborador_id: p.colaboradorEmail ? idDe(p.colaboradorEmail) : null },
      { onConflict: 'user_id,empresa_id,papel' },
    ),
    `papel de ${p.nome}`,
  )
  if (p.mentoraEmail) {
    exigir(
      await db.from('mentoria').upsert({ empresa_id: empresaId, mentor_user_id: userId, lider_id: idDe(p.mentoraEmail), ativo: true }, { onConflict: 'mentor_user_id,lider_id' }),
      `mentoria de ${p.nome}`,
    )
  }
  console.log(`Persona ${p.nome} (${p.papel}) pronta`)
}
console.log('Seed de demonstração concluído.')

// 4. Agenda e decisões fictícias da Marina (inclusões de 08/11/2026), relativas a hoje.
//    Só na primeira vez: se ela já tem compromissos, não mexe (o que ela criar na demo fica).
const marina = PERSONAS.find((p) => p.colaboradorEmail === 'marina.costa@exemplotech.com' && p.papel === 'lider')
const marinaUser = marina ? existentes.get(marina.email) ?? (await db.auth.admin.listUsers()).data.users.find((u) => u.email === marina.email)?.id : undefined
if (marina && marinaUser) {
  const jaTem = await db.from('compromisso').select('id', { count: 'exact', head: true }).eq('criado_por', marinaUser)
  if ((jaTem.count ?? 0) === 0) {
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const dia = (n: number) => {
      const d = new Date(`${hoje}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() + n)
      return d.toISOString().slice(0, 10)
    }
    const quando = (n: number, hora: string) => `${dia(n)}T${hora}:00-03:00`
    const lider = idDe('marina.costa@exemplotech.com')
    const base = { empresa_id: empresaId, lider_id: lider, criado_por: marinaUser }
    // Uma linha por vez: num insert em lote, coluna ausente em uma linha vira null (e não o padrão).
    const umPorUm = async <T,>(tabela: 'compromisso' | 'decisao', linhas: T[]) => {
      for (const l of linhas) exigir(await db.from(tabela).insert(l as never).select('id'), `${tabela} da Marina`)
    }
    await umPorUm('compromisso', [
        { ...base, colaborador_id: idDe('ana.faria@exemplotech.com'), tipo: 'um_a_um', titulo: '1:1 com Ana Faria', inicio: quando(-6, '10:00'), duracao_min: 30, status: 'realizado', realizado_em: quando(-6, '10:30'), relato: 'Revisamos o plano semanal; ela vai testar o quadro de prioridades.' },
        { ...base, colaborador_id: idDe('joao.lima@exemplotech.com'), tipo: 'feedback', titulo: 'Feedback sobre prazos de entrega', inicio: quando(-2, '15:00'), duracao_min: 45, local: 'Sala 3' },
        { ...base, colaborador_id: idDe('beatriz.rocha@exemplotech.com'), tipo: 'um_a_um', titulo: '1:1 com Beatriz Rocha', inicio: quando(0, '16:00'), duracao_min: 30, local: 'Meet' },
        { ...base, colaborador_id: idDe('carlos.nunes@exemplotech.com'), tipo: 'pdi', titulo: 'Conversa de PDI com Carlos', inicio: quando(1, '10:00'), duracao_min: 60, observacao: 'Foco em comunicação com clientes' },
        { ...base, colaborador_id: null, tipo: 'reuniao_equipe', titulo: 'Reunião de prioridades do suporte', inicio: quando(3, '09:30'), duracao_min: 60, local: 'Sala grande' },
        { ...base, colaborador_id: idDe('daniela.prado@exemplotech.com'), tipo: 'um_a_um', titulo: '1:1 com Daniela Prado', inicio: quando(8, '11:00'), duracao_min: 30 },
      ])
    await umPorUm('decisao', [
        { ...base, titulo: 'Escala de plantão de dezembro', pergunta: 'Como dividir o plantão de fim de ano entre as pessoas do suporte sem prejudicar o atendimento?', contexto: 'Equipe de 8 pessoas, 3 já pediram férias na segunda quinzena. O volume de chamados cai cerca de 30% em dezembro (fictício).', opcoes_iniciais: ['Rodízio semanal', 'Plantão voluntário com folga compensatória'], prazo_decisao: dia(4) },
        { ...base, titulo: 'Ferramenta para o quadro de prioridades', pergunta: 'Qual ferramenta a equipe usa para o quadro de prioridades da semana?', opcoes_iniciais: ['Planilha compartilhada', 'Quadro no sistema de chamados'], status: 'decidida', opcao_escolhida: 'Quadro no sistema de chamados', justificativa: 'Fica junto dos chamados e não exige outro acesso.', decidida_em: quando(-20, '17:00'), revisar_em: dia(-1) },
      ])
    console.log('Agenda e decisões fictícias da Marina criadas')
  } else console.log('Agenda da Marina já existe: mantida')
}

// 5. Frentes de gestão (desempenho, desenvolvimento, comportamento, liderança): registros,
//    ações de PDI, combinados já encerrados e mais 1:1 realizados. Só na primeira vez.
if (marina && marinaUser) {
  const lider = idDe('marina.costa@exemplotech.com')
  const jaTem = await db.from('acao_desenvolvimento').select('id', { count: 'exact', head: true }).eq('criado_por', marinaUser)
  if ((jaTem.count ?? 0) === 0) {
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const dia = (n: number) => {
      const d = new Date(`${hoje}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() + n)
      return d.toISOString().slice(0, 10)
    }
    const p = (email: string) => idDe(`${email}@exemplotech.com`)
    const um = async (tabela: 'registro' | 'acao_desenvolvimento' | 'combinado' | 'compromisso', linha: Record<string, unknown>) =>
      exigir(await db.from(tabela).insert(linha as never).select('id'), `${tabela} (frentes)`)
    const reg = (email: string, tipo: string, texto: string, n: number, visibilidade = 'privado') =>
      um('registro', { empresa_id: empresaId, colaborador_id: p(email), autor_user_id: marinaUser, tipo, texto, data_fato: dia(n), visibilidade })
    await reg('joao.lima', 'feedback', 'Duas respostas a cliente saíram depois do prazo combinado; conversamos sobre priorizar a fila pela manhã.', -9)
    await reg('beatriz.rocha', 'reconhecimento', 'Montou o roteiro de atendimento de primeiro nível; a equipe passou a usar no mesmo dia.', -5, 'linha_gestao')
    await reg('carlos.nunes', 'observacao', 'Na reunião de implantação, apresentou o cronograma sem consultar o suporte; combinamos alinhar antes da próxima.', -12)
    await reg('daniela.prado', 'alinhamento', 'Alinhamos que chamados críticos são escalados em até 30 minutos, com registro no sistema.', -15)
    await reg('eduardo.sales', 'feedback', 'Documentação do incidente da semana veio completa e no prazo; pedi para virar modelo da equipe.', -3, 'linha_gestao')
    await reg('fernanda.melo', 'reconhecimento', 'Auditoria de qualidade do mês entregue dois dias antes, com sugestões de melhoria.', -20, 'linha_gestao')
    await reg('gabriel.torres', 'observacao', 'Pediu ajuda para usar o assistente de IA nas respostas padrão; combinamos uma sessão com o Carlos.', -7)
    await reg('ana.faria', 'feedback', 'Plano semanal enviado nas duas últimas segundas; ainda falta indicar as dependências de outras áreas.', -6)

    const acao = (email: string, descricao: string, competencia: string, prazo: number, status: string) =>
      um('acao_desenvolvimento', { empresa_id: empresaId, colaborador_id: p(email), descricao, competencia, prazo: dia(prazo), status, origem: 'boomit_pdi', criado_por: marinaUser })
    await acao('ana.faria', 'Usar o quadro de prioridades toda segunda e revisar na sexta', 'Planejamento', 21, 'em_andamento')
    await acao('joao.lima', 'Praticar resumo de 3 pontos antes de responder clientes por escrito', 'Comunicação Objetiva', 30, 'em_andamento')
    await acao('beatriz.rocha', 'Conduzir uma reunião de alinhamento com o suporte por mês', 'Comunicação', 45, 'planejada')
    await acao('carlos.nunes', 'Mapear riscos do cronograma com o suporte antes de cada implantação', 'Riscos Calculados', 14, 'em_andamento')
    await acao('gabriel.torres', 'Sessão de prática com assistente de IA em respostas padrão', 'Maturidade em IA', -2, 'concluida')
    await acao('fernanda.melo', 'Apresentar o resultado da auditoria para a equipe', 'Conhecimento do Setor', -10, 'concluida')

    const comb = (email: string, descricao: string, prazo: number, status: string) =>
      um('combinado', {
        empresa_id: empresaId, lider_id: lider, colaborador_id: p(email), descricao, responsavel_tipo: 'colaborador', prazo: dia(prazo), status, origem: 'manual', criado_por: marinaUser,
        ...(status === 'cumprido' ? { concluido_em: dia(prazo), evidencia_registrada: 'Conferido no 1:1' } : {}),
      })
    await comb('eduardo.sales', 'Transformar o relatório de incidente em modelo da equipe', -4, 'cumprido')
    await comb('fernanda.melo', 'Enviar a auditoria de qualidade do mês', -22, 'cumprido')
    await comb('daniela.prado', 'Escalar chamados críticos em até 30 minutos', -8, 'cumprido')
    await comb('carlos.nunes', 'Revisar o cronograma de implantação com o suporte', -5, 'nao_cumprido')
    await comb('gabriel.torres', 'Testar o assistente de IA em 10 respostas padrão', 5, 'aberto')

    const umAUm = (email: string, nome: string, n: number) =>
      um('compromisso', {
        empresa_id: empresaId, lider_id: lider, criado_por: marinaUser, colaborador_id: p(email), tipo: 'um_a_um', titulo: `1:1 com ${nome}`,
        inicio: `${dia(n)}T14:00:00-03:00`, duracao_min: 30, status: 'realizado', realizado_em: `${dia(n)}T14:30:00-03:00`, relato: 'Conversa de acompanhamento (fictícia).',
      })
    await umAUm('joao.lima', 'João Lima', -12)
    await umAUm('eduardo.sales', 'Eduardo Sales', -18)
    await umAUm('fernanda.melo', 'Fernanda Melo', -41)
    console.log('Dados das frentes de gestão criados')
  } else console.log('Dados das frentes já existem: mantidos')
}
