// Testes do motor com o modelo simulado: nenhuma chamada à API.
import { describe, expect, it } from 'vitest'
import { CAMADAS, type ItemDeContexto } from './contexto.ts'
import { detectarSensivelPorTermos, termosProibidos } from './guardrails.ts'
import { estimarCusto } from './modelo.ts'
import { montarPacote } from './pacote.ts'
import { ID_RELATO, prepararSituacao } from './preparar.ts'
import { type Classificacao, type Plano, planoSchema } from './saida.ts'
import { gerarDebrief, responderComoInterlocutor } from './simulacao.ts'
import { ModeloSimulado } from './simulado.ts'
import { verificarPlano } from './verificacao.ts'

const item = (fonte_id: string, camada: ItemDeContexto['camada'], conteudo = `conteúdo de ${fonte_id}`): ItemDeContexto => ({
  fonte_id,
  rotulo: `Rótulo ${fonte_id}`,
  camada,
  conteudo,
  data: '2026-10-01',
})

const ITENS: ItemDeContexto[] = [
  item('org:1', CAMADAS.organizacao),
  item('pessoa:cadastro', CAMADAS.pessoa),
  item('pessoa:gap:prazos', CAMADAS.pessoa, 'Planejamento: atual 4.8, meta 8.'),
  item('pessoa:pdi', CAMADAS.pessoa, 'Entregas no prazo: 70% → 90%.'),
  item('hist:1', CAMADAS.historico),
]

const CLASSIFICACAO: Classificacao = { sensivel: false, categoria_sensivel: 'nenhuma', motivo_sensivel: '', frente: 'desempenho', informacoes_faltantes: [] }

const planoBase = (sobrescrever: Partial<Plano> = {}): Plano => ({
  resumo_situacao: 'Duas entregas atrasaram na última quinzena.',
  fatos_confirmados: [],
  fatos_a_confirmar: [],
  hipoteses: [],
  perguntas_sugeridas: ['O que atrapalhou as entregas?'],
  abordagem: { abertura: 'Quero conversar sobre as últimas entregas.', pontos_chave: ['Fatos e impacto'], evitar: ['Generalizar'] },
  riscos: [],
  combinados_propostos: [{ descricao: 'Revisar prioridades semanalmente', responsavel: 'colaborador', prazo_sugerido_dias: 7, evidencia_esperada: 'Lista enviada às segundas' }],
  encaminhamento: { necessario: false, motivo: '', canal: 'nenhum' },
  referencias: [],
  ...sobrescrever,
})

describe('pacote de contexto', () => {
  it('ordena por camada e dá apelidos F1, F2… a cada item citável; relato entra por último', () => {
    const p = montarPacote([item(ID_RELATO, CAMADAS.relato, 'relato'), ...ITENS])
    expect([...p.fontes.keys()]).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6'])
    expect(p.fontes.get('F1')?.fonte_id).toBe('org:1')
    expect(p.fontes.get('F6')?.fonte_id).toBe(ID_RELATO)
    expect(p.contexto).toContain('[F3] Rótulo pessoa:gap:prazos')
  })

  it('camadas 0–3 vão para o bloco estável, sem apelido', () => {
    const p = montarPacote([{ ...item('lente', CAMADAS.lente, 'LENTE DA EMPRESA'), rotulo: 'Lente' }, ...ITENS])
    expect(p.estavel).toContain('LENTE DA EMPRESA')
    expect([...p.fontes.values()].some((f) => f.fonte_id === 'lente')).toBe(false)
  })

  it('no limite, corta histórico antes da pessoa, mantém 3 itens da pessoa e nunca o relato', () => {
    const grandes = [
      ...ITENS.map((i) => ({ ...i, conteudo: 'x'.repeat(500) })),
      item('pessoa:extra', CAMADAS.pessoa, 'x'.repeat(500)),
      item(ID_RELATO, CAMADAS.relato, 'y'.repeat(5000)),
    ]
    const p = montarPacote(grandes, { maxCaracteres: 1500 })
    expect(p.cortados[0]).toBe('hist:1')
    const ids = [...p.fontes.values()].map((f) => f.fonte_id)
    expect(ids.filter((i) => i.startsWith('pessoa')).length).toBeGreaterThanOrEqual(3)
    expect(ids).toContain(ID_RELATO)
  })
})

describe('verificação determinística', () => {
  const pacote = montarPacote([...ITENS, item(ID_RELATO, CAMADAS.relato)])

  it('fato sem fonte válida cai em "fatos a confirmar"', () => {
    const { plano, alertas } = verificarPlano(
      planoBase({ fatos_confirmados: [{ texto: 'Ela sempre atrasa', fonte_ids: [] }, { texto: 'Inventado', fonte_ids: ['F99'] }] }),
      pacote.fontes,
    )
    expect(plano.fatos_confirmados).toEqual([])
    expect(plano.fatos_a_confirmar.map((f) => f.texto)).toEqual(['Ela sempre atrasa', 'Inventado'])
    expect(alertas).toContain('fato_sem_fonte_movido_para_a_confirmar')
    expect(alertas).toContain('fonte_inexistente:F99')
  })

  it('apelidos viram fonte_id reais e as referências são reconstruídas a partir do pacote', () => {
    const { plano } = verificarPlano(
      planoBase({
        fatos_confirmados: [{ texto: 'Planejamento abaixo da meta', fonte_ids: ['F3', 'F99'] }],
        hipoteses: [{ texto: 'Prioridades mudaram', base: ['F4'], como_testar_na_conversa: 'Perguntar' }],
        referencias: [{ fonte_id: 'F3', rotulo: 'rótulo inventado pelo modelo' }],
      }),
      pacote.fontes,
    )
    expect(plano.fatos_confirmados[0]?.fonte_ids).toEqual(['pessoa:gap:prazos'])
    expect(plano.hipoteses[0]?.base).toEqual(['pessoa:pdi'])
    expect(plano.referencias.map((r) => [r.apelido, r.rotulo])).toEqual([
      ['F3', 'Rótulo pessoa:gap:prazos'],
      ['F4', 'Rótulo pessoa:pdi'],
    ])
  })

  it('remove recomendação de decisão, causa por personalidade e inferência emocional', () => {
    const { plano, alertas } = verificarPlano(
      planoBase({
        perguntas_sugeridas: ['O que atrapalhou?', 'Por ser ENFJ, ela evita conflito?'],
        abordagem: { abertura: 'Oi', pontos_chave: ['Recomendo o desligamento se não melhorar', 'Fatos'], evitar: [] },
        riscos: ['Ela está desmotivada e quer sair da empresa'],
      }),
      pacote.fontes,
    )
    expect(plano.perguntas_sugeridas).toEqual(['O que atrapalhou?'])
    expect(plano.abordagem.pontos_chave).toEqual(['Fatos'])
    expect(plano.riscos).toEqual([])
    expect(alertas.some((a) => a.includes('decisao_sobre_pessoa'))).toBe(true)
    expect(alertas.some((a) => a.includes('causa_por_personalidade'))).toBe(true)
    expect(alertas.some((a) => a.includes('inferencia_emocional'))).toBe(true)
  })

  it('combinado sem prazo recebe 7 dias e gera alerta', () => {
    const { plano, alertas } = verificarPlano(
      planoBase({ combinados_propostos: [{ descricao: 'Alinhar', responsavel: 'lider', prazo_sugerido_dias: 0, evidencia_esperada: 'Ata' }] }),
      pacote.fontes,
    )
    expect(plano.combinados_propostos[0]?.prazo_sugerido_dias).toBe(7)
    expect(alertas).toContain('combinado_sem_prazo')
  })
})

describe('guardrails', () => {
  it.each([
    'Uma pessoa da equipe relatou assédio do coordenador',
    'Ele fez comentários racistas na reunião',
    'Recebi uma ameaça de um colega',
    'Ela falou em suicídio ontem',
    'Suspeito de fraude nas notas de reembolso',
    'Um cliente tem feito comentários de cunho sexual com ela nas reuniões',
  ])('relato sensível: %s', (relato) => {
    expect(detectarSensivelPorTermos(relato).sensivel).toBe(true)
  })

  it('relato comum não é sensível', () => {
    expect(detectarSensivelPorTermos('Duas entregas fora do prazo combinado na última quinzena').sensivel).toBe(false)
  })

  it('termos proibidos', () => {
    expect(termosProibidos('Sugiro a promoção dela')).toEqual(['decisao_sobre_pessoa'])
    expect(termosProibidos('Pergunte o que mudou nas prioridades')).toEqual([])
  })
})

describe('prepararSituacao (modelo simulado)', () => {
  const modelos = { principal: 'modelo-principal', rapido: 'modelo-rapido' }

  it('relato com indício de assédio vira encaminhamento sem chamar nenhum modelo', async () => {
    const cliente = new ModeloSimulado({})
    const r = await prepararSituacao({ relato: 'A Ana disse que sofre assédio do cliente', itens: ITENS, cliente, modelos })
    expect(r.tipo).toBe('encaminhamento')
    expect(cliente.chamadas).toHaveLength(0)
  })

  it('classificador sensível: encaminhamento, e o modelo principal não é chamado', async () => {
    const cliente = new ModeloSimulado({ classificacao: () => ({ ...CLASSIFICACAO, sensivel: true, categoria_sensivel: 'risco_saude_integridade', motivo_sensivel: 'Sofrimento intenso' }) })
    const r = await prepararSituacao({ relato: 'Ela chorou muito e disse que não aguenta mais', itens: ITENS, cliente, modelos })
    expect(r.tipo).toBe('encaminhamento')
    expect(cliente.chamadas.map((c) => c.finalidade)).toEqual(['classificacao'])
  })

  it('caminho normal: classifica com o rápido, gera com o principal, verifica e cita fontes', async () => {
    const cliente = new ModeloSimulado({
      classificacao: () => CLASSIFICACAO,
      preparacao: () => planoBase({ fatos_confirmados: [{ texto: 'Planejamento atual 4.8, meta 8', fonte_ids: ['F3'] }, { texto: 'Sem fonte', fonte_ids: [] }] }),
    })
    const r = await prepararSituacao({ relato: 'Duas entregas fora do prazo combinado na última quinzena', itens: ITENS, cliente, modelos })
    if (r.tipo !== 'plano') throw new Error('esperava plano')
    expect(cliente.chamadas.map((c) => [c.finalidade, c.modelo])).toEqual([
      ['classificacao', 'modelo-rapido'],
      ['preparacao', 'modelo-principal'],
    ])
    expect(r.plano.fatos_confirmados.map((f) => f.fonte_ids)).toEqual([['pessoa:gap:prazos']])
    expect(r.plano.fatos_a_confirmar.map((f) => f.texto)).toContain('Sem fonte')
    expect(r.chamadas.map((c) => c.versao_prompt)).toEqual(['classificacao@1', 'preparacao-feedback@2'])
    // O que foi para o modelo: guardrails no bloco estável com cache, relato citável no contexto.
    const enviado = cliente.chamadas[1]!
    expect(enviado.sistema[0]?.cache).toBe(true)
    expect(enviado.sistema[0]?.texto).toContain('Regras da plataforma')
    expect(enviado.sistema[1]?.texto).toContain('Duas entregas fora do prazo')
  })

  it('a saída do modelo passa pelo schema', () => {
    expect(planoSchema.safeParse(planoBase()).success).toBe(true)
    expect(planoSchema.safeParse({ ...planoBase(), extra: 1 }).success).toBe(false)
  })
})

describe('simulação e debrief (modelo simulado)', () => {
  const falas = [
    { quem: 'lider' as const, texto: 'Queria falar das duas últimas entregas.' },
  ]

  it('interlocutor responde em streaming com a intensidade pedida', async () => {
    const cliente = new ModeloSimulado({ simulacao: () => 'As prioridades mudaram na semana passada.' })
    const pedacos: string[] = []
    const r = await responderComoInterlocutor({ nomeInterlocutor: 'Ana', intensidade: 'desafiadora', itens: ITENS, resumoPlano: null, falas, cliente, modelo: 'm', aoTexto: (t) => pedacos.push(t) })
    expect(pedacos.join('')).toBe(r.texto)
    expect(cliente.chamadas[0]?.sistema[0]?.texto).toMatch(/defensiva/)
    expect(cliente.chamadas[0]?.sistema[0]?.texto).toMatch(/não uma imitação da pessoa real/)
  })

  it('a simulação só responde depois de uma fala do líder', async () => {
    const cliente = new ModeloSimulado({ simulacao: () => 'x' })
    await expect(
      responderComoInterlocutor({ nomeInterlocutor: 'Ana', intensidade: 'moderada', itens: ITENS, resumoPlano: null, falas: [], cliente, modelo: 'm' }),
    ).rejects.toThrow(/próxima fala do líder/)
  })

  it('debrief traz os cinco critérios e nenhuma nota', async () => {
    const criterio = { avaliacao: 'parcial' as const, trecho: 'Queria falar das duas últimas entregas.', sugestao: 'Traga um exemplo com data.' }
    const cliente = new ModeloSimulado({
      debrief: () => ({
        criterios: { escuta: criterio, especificidade: criterio, exploracao_causas: criterio, clareza_combinado: criterio, tom: criterio },
        ponto_forte: 'Abriu com o tema',
        proximo_passo: 'Perguntar sobre obstáculos',
      }),
    })
    const r = await gerarDebrief({ nomeInterlocutor: 'Ana', intensidade: 'moderada', resumoPlano: null, falas, cliente, modelo: 'm' })
    expect(Object.keys(r.debrief.criterios)).toEqual(['escuta', 'especificidade', 'exploracao_causas', 'clareza_combinado', 'tom'])
    expect(JSON.stringify(r.debrief)).not.toMatch(/"nota"|"score"/)
  })
})

describe('custo', () => {
  it('estima pelo preço por milhão de tokens; modelo desconhecido → null', () => {
    const uso = { modelo: 'claude-sonnet-5-5', tokens_entrada: 1_000_000, tokens_saida: 100_000, cache_leitura: 0, cache_escrita: 0, latencia_ms: 0 }
    expect(estimarCusto(uso)).toBe(3)
    expect(estimarCusto({ ...uso, modelo: 'outro' })).toBeNull()
  })
})
