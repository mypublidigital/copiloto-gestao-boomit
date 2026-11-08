import { describe, expect, it } from 'vitest'
import { decidirDestino } from '../email/provedor.ts'
import { emailDeInsights, emailDeLembrete } from '../email/modelos.ts'
import { insightsDeterministicos } from '../motor/insights.ts'
import { fatosDaSemana, lerSemana, type Semana } from './semana.ts'

const agora = new Date('2026-11-09T10:00:00Z')
const semana = (): Semana => ({
  agora,
  equipe: [
    { id: 'ana', nome: 'Ana' },
    { id: 'bia', nome: 'Bia' },
    { id: 'caio', nome: 'Caio' },
  ],
  compromissos: [
    { id: 'c1', titulo: '1:1 Ana', tipo: 'um_a_um', inicio: '2026-11-05T13:00:00Z', status: 'realizado', colaborador_id: 'ana', realizado_em: '2026-11-05T14:00:00Z' },
    { id: 'c2', titulo: 'Feedback Bia', tipo: 'feedback', inicio: '2026-11-06T13:00:00Z', status: 'agendado', colaborador_id: 'bia', realizado_em: null },
    { id: 'c3', titulo: '1:1 Caio', tipo: 'um_a_um', inicio: '2026-11-12T13:00:00Z', status: 'agendado', colaborador_id: 'caio', realizado_em: null },
  ],
  combinados: [
    { id: 'k1', descricao: 'Plano semanal', prazo: '2026-11-07', status: 'aberto', colaborador_id: 'ana', concluido_em: null },
    { id: 'k2', descricao: 'Relatório', prazo: '2026-11-12', status: 'aberto', colaborador_id: 'bia', concluido_em: null },
    { id: 'k3', descricao: 'Checklist', prazo: '2026-11-04', status: 'cumprido', colaborador_id: 'caio', concluido_em: '2026-11-04' },
  ],
  decisoes: [
    { id: 'd1', titulo: 'Plantão', status: 'em_analise', prazo_decisao: '2026-11-10', revisar_em: null, decidida_em: null, versao_analise: 1 },
    { id: 'd2', titulo: 'Ferramenta', status: 'decidida', prazo_decisao: null, revisar_em: '2026-11-08', decidida_em: '2026-10-01T12:00:00Z', versao_analise: 1 },
  ],
  revisoesPendentes: 2,
})

describe('agentes da semana', () => {
  it('levantam os sinais esperados, sem avaliar pessoas', () => {
    const sinais = lerSemana(semana())
    const porId = Object.fromEntries(sinais.map((s) => [s.fonte_id, s.prioridade]))
    expect(porId).toMatchObject({
      'combinado:k1': 'alta', // vencido
      'combinado:k2': 'media', // vence em 3 dias
      'compromisso:c2': 'media', // passou e segue agendado
      'cadencia:bia': 'media', // nunca teve 1:1
      'decisao:d2': 'media', // revisão vencida
      'revisoes:pendentes': 'media',
    })
    expect(porId['decisao:d1']).toBe('alta') // prazo em 1 dia
    expect(porId['cadencia:ana']).toBeUndefined() // 1:1 há 4 dias
    expect(porId['cadencia:caio']).toBeUndefined() // 1:1 agendado
    expect(porId['combinado:k3']).toBeUndefined()
  })

  it('fatos da semana: realizado, cumprido e decidido nos últimos 7 dias', () => {
    expect(fatosDaSemana(semana()).map((f) => f.fonte_id)).toEqual(['compromisso:c1', 'combinado:k3'])
  })
})

describe('e-mails', () => {
  it('lembrete de véspera de compromisso leva para preparar, sem conteúdo privado', () => {
    const e = emailDeLembrete({
      etapa: 'vespera',
      nomeDestinatario: 'Marina Costa',
      urlApp: 'https://app.exemplo',
      origem: { tipo: 'compromisso', id: 'c9', titulo: '1:1 com <Ana>', tipoCompromisso: 'um_a_um', inicio: '2026-11-10T13:00:00Z', duracaoMin: 30, local: null, pessoa: 'Ana' },
    })
    expect(e.assunto).toBe('Amanhã: 1:1 com Ana')
    expect(e.html).toContain('&lt;Ana&gt;')
    expect(e.texto).toContain('https://app.exemplo/agenda?compromisso=c9')
    expect(e.texto).toContain('Olá, Marina.')
  })

  it('insights semanais listam recomendações por prioridade', () => {
    const i = insightsDeterministicos(lerSemana(semana()))
    const e = emailDeInsights({ nomeDestinatario: 'Marina', semanaInicio: '2026-11-09', insights: i, urlApp: 'https://app.exemplo', proximos: [] })
    expect(e.assunto).toBe('Sua semana de gestão · 09/11/2026')
    expect(e.texto.indexOf('Prioridade alta')).toBeLessThan(e.texto.indexOf('Prioridade média'))
  })

  it('nunca envia para usuário de demonstração; redireciona só se houver destino de teste', () => {
    expect(decidirDestino({ para: 'x@exemplotech.com', destinatarioDemo: true, temProvedor: true, destinoTeste: null }).status).toBe('bloqueado_demo')
    expect(decidirDestino({ para: 'x@exemplotech.com', destinatarioDemo: true, temProvedor: true, destinoTeste: 'eu@real.com' })).toMatchObject({ status: 'enviar', para: 'eu@real.com' })
    expect(decidirDestino({ para: 'x@empresa.com', destinatarioDemo: false, temProvedor: false, destinoTeste: null }).status).toBe('aguardando_provedor')
    expect(decidirDestino({ para: 'x@empresa.com', destinatarioDemo: false, temProvedor: true, destinoTeste: null })).toMatchObject({ status: 'enviar', para: 'x@empresa.com' })
  })
})
