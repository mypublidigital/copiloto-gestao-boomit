// Sprint 3: demais tipos de preparação (modelo simulado, sem API).
import { describe, expect, it } from 'vitest'
import { CAMADAS, type ItemDeContexto } from './contexto.ts'
import { montarPacote } from './pacote.ts'
import { prepararSituacao } from './preparar.ts'
import { type Classificacao, jsonSchemaDe, type Plano, schemaDoPlano, TIPOS_PREPARACAO } from './saida.ts'
import { ModeloSimulado } from './simulado.ts'
import { verificarPlano } from './verificacao.ts'

const item = (fonte_id: string, camada: ItemDeContexto['camada'], conteudo = `conteúdo de ${fonte_id}`): ItemDeContexto => ({
  fonte_id,
  rotulo: `Rótulo ${fonte_id}`,
  camada,
  conteudo,
  data: null,
})

const ITENS = [
  item('alcada:tatico', CAMADAS.politicas_e_alcadas, 'Nível tático decide escala e folgas até 2 dias.'),
  item('pessoa:gap', CAMADAS.pessoa, 'Planejamento: atual 4.8, meta 8.'),
  item('pessoa:pdi', CAMADAS.pessoa, 'PDI: planejamento semanal.'),
]
const pacote = montarPacote(ITENS)
const apelido = (fonteId: string) => [...pacote.fontes.values()].find((f) => f.fonte_id === fonteId)!.apelido

const base = (): Plano => ({
  resumo_situacao: 'Resumo.',
  fatos_confirmados: [],
  fatos_a_confirmar: [],
  hipoteses: [],
  perguntas_sugeridas: ['O que você precisa?'],
  abordagem: { abertura: 'Oi', pontos_chave: ['Ponto'], evitar: [] },
  riscos: [],
  combinados_propostos: [],
  encaminhamento: { necessario: false, motivo: '', canal: 'nenhum' },
  referencias: [],
})

describe('schemas por tipo', () => {
  it('cada tipo tem schema; só os tipos estendidos exigem "extensao"', () => {
    for (const tipo of TIPOS_PREPARACAO) {
      const js = JSON.stringify(jsonSchemaDe(schemaDoPlano(tipo)))
      expect(js.includes('"extensao"'), tipo).toBe(tipo !== 'feedback')
    }
  })

  it('a extensão precisa ser do tipo certo', () => {
    const pdi = schemaDoPlano('pdi')
    expect(pdi.safeParse({ ...base(), extensao: { tipo: 'pdi', acoes_desenvolvimento: [] } }).success).toBe(true)
    expect(pdi.safeParse({ ...base(), extensao: { tipo: 'conversa_dificil', interesses_de_cada_parte: [], pontos_de_acordo_possiveis: [] } }).success).toBe(false)
    expect(pdi.safeParse(base()).success).toBe(false)
  })
})

describe('verificação das extensões', () => {
  it('decisão: "sim" sem política de alçada citada vira "incerto"', () => {
    const plano: Plano = {
      ...base(),
      extensao: { tipo: 'decisao_alcada', dentro_da_alcada: 'sim', justificativa_alcada: 'x', alcada_fonte_ids: [], alternativas: [], quem_consultar: 'RH', como_comunicar: 'x' },
    }
    const r = verificarPlano(plano, pacote.fontes)
    expect(r.plano.extensao).toMatchObject({ dentro_da_alcada: 'incerto' })
    expect(r.alertas).toContain('alcada_sem_fonte_marcada_incerto')
  })

  it('decisão: citar a política mantém a resposta; citar outra fonte não vale como alçada', () => {
    const comPolitica = verificarPlano(
      { ...base(), extensao: { tipo: 'decisao_alcada', dentro_da_alcada: 'sim', justificativa_alcada: 'x', alcada_fonte_ids: [apelido('alcada:tatico')], alternativas: [], quem_consultar: '', como_comunicar: '' } },
      pacote.fontes,
    )
    expect(comPolitica.plano.extensao).toMatchObject({ dentro_da_alcada: 'sim', alcada_fonte_ids: ['alcada:tatico'] })
    expect(comPolitica.plano.referencias.map((r) => r.fonte_id)).toContain('alcada:tatico')

    const semPolitica = verificarPlano(
      { ...base(), extensao: { tipo: 'decisao_alcada', dentro_da_alcada: 'nao', justificativa_alcada: 'x', alcada_fonte_ids: [apelido('pessoa:gap')], alternativas: [], quem_consultar: '', como_comunicar: '' } },
      pacote.fontes,
    )
    expect(semPolitica.plano.extensao).toMatchObject({ dentro_da_alcada: 'incerto', alcada_fonte_ids: [] })
  })

  it('decisão: alternativa que recomenda desligar sai da lista', () => {
    const r = verificarPlano(
      {
        ...base(),
        extensao: {
          tipo: 'decisao_alcada',
          dentro_da_alcada: 'incerto',
          justificativa_alcada: '',
          alcada_fonte_ids: [],
          alternativas: [
            { opcao: 'Recomendo o desligamento imediato', pros: [], contras: [] },
            { opcao: 'Reorganizar a escala da equipe', pros: ['rápido'], contras: ['sobrecarga'] },
          ],
          quem_consultar: 'RH',
          como_comunicar: '',
        },
      },
      pacote.fontes,
    )
    const ext = r.plano.extensao
    if (ext?.tipo !== 'decisao_alcada') throw new Error('extensão errada')
    expect(ext.alternativas.map((a) => a.opcao)).toEqual(['Reorganizar a escala da equipe'])
  })

  it('PDI: fontes das ações viram fonte_id reais; prazo inválido vira 30 dias', () => {
    const r = verificarPlano(
      {
        ...base(),
        extensao: {
          tipo: 'pdi',
          acoes_desenvolvimento: [{ competencia: 'Planejamento', acao: 'Plano semanal', apoio: '1:1', prazo_dias: 0, evidencia: 'plano enviado', fonte_ids: [apelido('pessoa:gap'), 'F99'] }],
        },
      },
      pacote.fontes,
    )
    const ext = r.plano.extensao
    if (ext?.tipo !== 'pdi') throw new Error('extensão errada')
    expect(ext.acoes_desenvolvimento[0]).toMatchObject({ prazo_dias: 30, fonte_ids: ['pessoa:gap'] })
    expect(r.alertas).toContain('fonte_inexistente:F99')
  })

  it('1:1: perguntas e pauta passam pelas mesmas regras', () => {
    const r = verificarPlano(
      {
        ...base(),
        extensao: {
          tipo: 'preparacao_reuniao',
          pauta: [{ tema: 'Pauta da pessoa', objetivo: 'ouvir', minutos: 10.4 }],
          perguntas_de_desenvolvimento: ['O que você quer aprender?', 'Ela está desmotivada?'],
        },
      },
      pacote.fontes,
    )
    const ext = r.plano.extensao
    if (ext?.tipo !== 'preparacao_reuniao') throw new Error('extensão errada')
    expect(ext.perguntas_de_desenvolvimento).toEqual(['O que você quer aprender?'])
    expect(ext.pauta[0]?.minutos).toBe(10)
  })
})

describe('prepararSituacao por tipo', () => {
  const CLASSIFICACAO: Classificacao = { sensivel: false, categoria_sensivel: 'nenhuma', motivo_sensivel: '', frente: 'organizacao', informacoes_faltantes: [] }

  it('decisão na alçada: instruções do tipo, política citável no contexto, versão do prompt do tipo', async () => {
    const cliente = new ModeloSimulado({
      classificacao: () => CLASSIFICACAO,
      preparacao: () => ({
        ...base(),
        extensao: { tipo: 'decisao_alcada', dentro_da_alcada: 'sim', justificativa_alcada: 'Folga de 1 dia', alcada_fonte_ids: ['F1'], alternativas: [], quem_consultar: '', como_comunicar: '' },
      }),
    })
    const r = await prepararSituacao({ tipo: 'decisao_alcada', relato: 'Pedido de folga de um dia na sexta.', itens: ITENS, cliente, modelos: { principal: 'p', rapido: 'r' } })
    if (r.tipo !== 'plano') throw new Error('esperava plano')
    const enviada = cliente.chamadas[1]!
    expect(enviada.sistema[0]?.texto).toContain('DECISÃO NA ALÇADA')
    expect(enviada.sistema[1]?.texto).toContain('## Políticas e alçadas')
    expect(r.plano.extensao).toMatchObject({ dentro_da_alcada: 'sim', alcada_fonte_ids: ['alcada:tatico'] })
    expect(r.chamadas[1]?.versao_prompt).toBe('preparacao-decisao_alcada@2')
  })
})
