// Inclusões de 08/11/2026: apoio à decisão e insights semanais (modelo simulado, sem API).
import { describe, expect, it } from 'vitest'
import { CAMADAS, type ItemDeContexto } from './contexto.ts'
import { type AnaliseDecisao, apoiarDecisao, verificarDecisao } from './decisao.ts'
import { gerarInsights, insightsDeterministicos, type SinalDaSemana } from './insights.ts'
import { montarPacote } from './pacote.ts'
import { jsonSchemaDe } from './saida.ts'
import { analiseDecisaoSchema } from './decisao.ts'
import { insightsSchema } from './insights.ts'
import { ModeloSimulado } from './simulado.ts'

const item = (fonte_id: string, camada: ItemDeContexto['camada'], conteudo = `conteúdo de ${fonte_id}`): ItemDeContexto => ({ fonte_id, rotulo: `Rótulo ${fonte_id}`, camada, conteudo, data: null })
const ITENS = [item('alcada:tatico', CAMADAS.politicas_e_alcadas, 'Nível tático decide escala e folgas.'), item('empresa:valores', CAMADAS.organizacao, 'Valores: cliente primeiro.')]
const pacote = montarPacote(ITENS)
const apelido = (id: string) => [...pacote.fontes.values()].find((f) => f.fonte_id === id)!.apelido

const analise = (): AnaliseDecisao => ({
  reformulacao: 'Decidir como dividir o plantão.',
  criterios: [
    { criterio: 'Carga da equipe', peso: 5, por_que: 'Evitar sobrecarga.' },
    { criterio: 'Custo', peso: 1, por_que: 'Orçamento.' },
  ],
  alternativas: [
    { opcao: 'Rodízio', descricao: 'Cada semana uma pessoa.', pros: ['Justo'], contras: ['Exige escala'], riscos: [], reversibilidade: 'facil', notas: [{ criterio: 'Carga da equipe', nota: 5, justificativa: '' }, { criterio: 'Custo', nota: 1, justificativa: '' }] },
    { opcao: 'Contratar temporário', descricao: 'Reforço externo.', pros: [], contras: ['Caro'], riscos: [], reversibilidade: 'media', notas: [{ criterio: 'Carga da equipe', nota: 3, justificativa: '' }, { criterio: 'custo', nota: 9, justificativa: '' }] },
  ],
  fatos_considerados: [{ texto: 'A empresa prioriza o cliente.', fonte_ids: [apelido('empresa:valores')] }, { texto: 'A equipe está com 3 pessoas.', fonte_ids: [] }],
  informacoes_faltantes: [],
  alcada: { dentro_da_alcada: 'sim', justificativa: 'Escala é do nível tático.', fonte_ids: [apelido('alcada:tatico')] },
  quem_consultar: ['RH'],
  impacto_em_pessoas: ['Comunicar a escala com antecedência.'],
  proximos_passos: ['Ouvir a equipe.'],
  sugestao_revisao_dias: 2,
  encaminhamento: { necessario: false, motivo: '' },
})

describe('apoio à decisão', () => {
  it('calcula a pontuação ponderada no motor e limita notas e pesos', () => {
    const { analise: a } = verificarDecisao(analise(), pacote.fontes)
    // Rodízio: (5*5 + 1*1)/6 = 4.3 · Temporário: (5*3 + 1*5)/6 = 3.3 (nota 9 vira 5; critério sem diferenciar maiúsculas)
    expect(a.alternativas.map((x) => x.pontuacao)).toEqual([4.3, 3.3])
    expect(a.sugestao_revisao_dias).toBe(7)
  })

  it('fato sem fonte vira informação a confirmar e as fontes viram ids reais', () => {
    const { analise: a, alertas } = verificarDecisao(analise(), pacote.fontes)
    expect(a.fatos_considerados).toEqual([{ texto: 'A empresa prioriza o cliente.', fonte_ids: ['empresa:valores'] }])
    expect(a.informacoes_faltantes.map((i) => i.pergunta)).toContain('Confirmar: A equipe está com 3 pessoas.')
    expect(alertas).toContain('fato_sem_fonte_movido_para_a_confirmar')
    expect(a.alcada.fonte_ids).toEqual(['alcada:tatico'])
  })

  it('alçada "sim" sem política citada vira "incerto"', () => {
    const x = analise()
    x.alcada.fonte_ids = [apelido('empresa:valores')]
    const { analise: a } = verificarDecisao(x, pacote.fontes)
    expect(a.alcada.dentro_da_alcada).toBe('incerto')
  })

  it('alternativa que decide sobre a pessoa é removida', () => {
    const x = analise()
    x.alternativas[1]!.descricao = 'Recomendo o desligamento da pessoa.'
    const { analise: a, alertas } = verificarDecisao(x, pacote.fontes)
    expect(a.alternativas).toHaveLength(1)
    expect(alertas).toContain('alternativa_removida_por_regra')
  })

  it('termo sensível não chega ao modelo', async () => {
    const modelo = new ModeloSimulado({})
    const r = await apoiarDecisao({ titulo: 'Denúncia', pergunta: 'Recebi uma denúncia de assédio, o que faço?', contexto: null, opcoes: [], prazo: null, itens: ITENS, cliente: modelo, modelo: 'm' })
    expect(r.tipo).toBe('encaminhamento')
    expect(modelo.chamadas).toHaveLength(0)
  })

  it('envia guardrails, alçadas citáveis e o pedido do líder', async () => {
    const modelo = new ModeloSimulado({ apoio_decisao: () => ({ ...analise(), fatos_considerados: [], alcada: { dentro_da_alcada: 'incerto', justificativa: '', fonte_ids: [] } }) })
    const r = await apoiarDecisao({ titulo: 'Plantão', pergunta: 'Como dividir o plantão?', contexto: 'Dezembro', opcoes: ['Rodízio'], prazo: '2026-12-01', itens: ITENS, cliente: modelo, modelo: 'm' })
    expect(r.tipo).toBe('analise')
    const chamada = modelo.chamadas[0]!
    expect(chamada.sistema[0]!.texto).toContain('Regras da plataforma')
    expect(chamada.sistema[1]!.texto).toContain('Nível tático decide')
    expect(chamada.mensagens[0]!.texto).toContain('- Rodízio')
  })

  it('o schema vira JSON Schema aceito pela API', () => {
    expect(jsonSchemaDe(analiseDecisaoSchema)).toMatchObject({ type: 'object' })
    expect(jsonSchemaDe(insightsSchema)).toMatchObject({ type: 'object' })
  })
})

const SINAIS: SinalDaSemana[] = [
  { fonte_id: 'combinado:1', agente: 'Combinados', titulo: 'Combinado vencido', detalhe: 'Venceu ontem.', prioridade: 'alta', acao_sugerida: 'Renegociar.', link: '/combinados' },
  { fonte_id: 'cadencia:ana', agente: 'Cadência de 1:1', titulo: 'Agendar 1:1 com Ana', detalhe: 'Há 40 dias.', prioridade: 'media', acao_sugerida: 'Agendar.', link: '/agenda' },
]

describe('insights semanais', () => {
  it('sem modelo, as regras montam o resumo em ordem de prioridade', () => {
    const i = insightsDeterministicos([...SINAIS].reverse())
    expect(i.recomendacoes.map((r) => r.prioridade)).toEqual(['alta', 'media'])
    expect(i.gerado_por).toBe('regras')
  })

  it('recomendação sem sinal sai; sinal alto esquecido entra; termo proibido sai', async () => {
    const modelo = new ModeloSimulado({
      insights_semanais: (c) => {
        const ctx = (c as { sistema: { texto: string }[] }).sistema[1]!.texto
        const ana = /\[(F\d+)\] Sinal \(Cadência/.exec(ctx)![1]!
        return {
          resumo_da_semana: 'Semana com um ponto de atenção.',
          destaques: [{ texto: 'Sem fonte', fonte_ids: ['F99'] }],
          recomendacoes: [
            { titulo: 'Agendar 1:1', acao: 'Agende com Ana.', por_que: 'Faz tempo.', prioridade: 'media', fonte_ids: [ana], prazo_sugerido_dias: 30 },
            { titulo: 'Inventada', acao: 'Faça algo.', por_que: '', prioridade: 'alta', fonte_ids: [], prazo_sugerido_dias: 3 },
            { titulo: 'Ana', acao: 'Ana parece estar desmotivada, converse.', por_que: '', prioridade: 'baixa', fonte_ids: [ana], prazo_sugerido_dias: 3 },
          ],
          pergunta_reflexao: 'O que você aprendeu?',
        }
      },
    })
    const r = await gerarInsights({ sinais: SINAIS, fatos: [], cliente: modelo, modelo: 'm' })
    const recs = r.insights.recomendacoes
    expect(recs.map((x) => x.titulo)).toEqual(['Combinado vencido', 'Agendar 1:1'])
    expect(recs[1]!.prazo_sugerido_dias).toBe(14)
    expect(recs[1]!.link).toBe('/agenda')
    expect(r.insights.destaques).toHaveLength(0)
    expect(r.alertas).toEqual(expect.arrayContaining(['recomendacao_sem_sinal', 'insight_removido_por_regra', 'sinal_alto_incluido_pelas_regras']))
  })
})

describe('apelidos no texto livre', () => {
  it('saem do texto, sem mexer no resto', async () => {
    const { semApelidos } = await import('./pacote.ts')
    expect(semApelidos({ a: 'Meta de NPS (F7); carga (F1, F3).', b: ['Sem fonte'] })).toEqual({ a: 'Meta de NPS; carga.', b: ['Sem fonte'] })
  })
})
