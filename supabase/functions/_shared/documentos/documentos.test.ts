import { readFileSync } from 'node:fs'
import path from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { extrairDeTrechos } from '../motor/extracao.ts'
import { ModeloSimulado } from '../motor/simulado.ts'
import { detectarFormato, dividirEmTrechos, extrairTexto, formatoDoArquivo, sugerirPessoas, textoDeVtt } from './texto.ts'

const GEMINI = readFileSync(path.resolve(import.meta.dirname, '../../../../fixtures/reunioes/anotacoes-gemini-exemplo.md'), 'utf8')
const EQUIPE = [
  { id: 'ana', nome: 'Ana Faria' },
  { id: 'daniela', nome: 'Daniela Prado' },
  { id: 'joao', nome: 'João Lima' },
]

describe('leitura de documentos', () => {
  it('formatos aceitos pela extensão', () => {
    expect(formatoDoArquivo('ata.DOCX')).toBe('docx')
    expect(formatoDoArquivo('gravacao.mp3')).toBeNull()
  })

  it('anotações do Gemini: detecta o formato e separa "Próximas etapas" em trecho próprio', () => {
    expect(detectarFormato(GEMINI)).toBe('gemini_notas')
    const trechos = dividirEmTrechos(GEMINI, 'gemini_notas')
    const proximas = trechos.find((t) => t.texto.startsWith('Próximas etapas'))
    expect(proximas?.texto).toContain('[Ana Faria] Enviar o plano da semana')
    expect(trechos.every((t) => t.texto.length <= 1500)).toBe(true)
  })

  it('transcrição: detecta locutores e agrupa turnos com tempo inicial', () => {
    const t = '[00:00:05] Marina Costa: Bom dia.\n[00:00:09] Ana Faria: Bom dia, tudo bem?\n[00:00:15] Marina Costa: Vamos falar das entregas.\n[00:01:02] Ana Faria: Combinado.'
    expect(detectarFormato(t)).toBe('transcricao')
    const trechos = dividirEmTrechos(t, 'transcricao')
    expect(trechos).toHaveLength(1)
    expect(trechos[0]).toMatchObject({ inicio_seg: 5, locutor: null })
  })

  it('VTT: mantém o locutor de <v Nome>', () => {
    const vtt = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\n<v Marina Costa>Vamos começar.</v>\n\n2\n00:00:04.000 --> 00:00:06.000\n<v Ana Faria>Pode ser.</v>'
    expect(textoDeVtt(vtt)).toBe('Marina Costa: Vamos começar.\nAna Faria: Pode ser.')
  })

  it('DOCX: extrai os parágrafos', async () => {
    const xml = '<w:document><w:body><w:p><w:r><w:t>Primeiro parágrafo</w:t></w:r></w:p><w:p><w:r><w:t>Segundo &amp; último</w:t></w:r></w:p></w:body></w:document>'
    const docx = zipSync({ 'word/document.xml': strToU8(xml) })
    expect(await extrairTexto(docx, 'docx')).toBe('Primeiro parágrafo\nSegundo & último')
  })

  it('sugere pessoas citadas: nome completo ou primeiro nome único na equipe', () => {
    expect(sugerirPessoas(GEMINI, EQUIPE).sort()).toEqual(['ana', 'daniela'])
    expect(sugerirPessoas('Falamos com o João sobre o projeto', EQUIPE)).toEqual(['joao'])
  })
})

describe('extração de combinados (modelo simulado)', () => {
  const trechos = dividirEmTrechos(GEMINI, 'gemini_notas').map((t, i) => ({ id: `trecho-${i + 1}`, texto: t.texto, locutor: t.locutor }))
  const idProximas = trechos.find((t) => t.texto.startsWith('Próximas etapas'))!.id
  const apelidoProximas = `T${trechos.findIndex((t) => t.id === idProximas) + 1}`

  it('aponta o trecho real, converte prazo relativo e descarta item sem trecho', async () => {
    const cliente = new ModeloSimulado({
      extracao: () => ({
        itens: [
          { tipo: 'combinado', descricao: 'Enviar o plano da semana toda segunda', responsavel_nome: 'Ana Faria', prazo_data: '', prazo_relativo_dias: 5, trecho: apelidoProximas, confianca: 0.93 },
          { tipo: 'combinado', descricao: 'Revisar o indicador de entregas', responsavel_nome: 'Marina Costa', prazo_data: '2026-11-20', prazo_relativo_dias: 0, trecho: `[${apelidoProximas}]`, confianca: 1.4 },
          { tipo: 'tema', descricao: 'Critério de aceite entre áreas', responsavel_nome: '', prazo_data: '2026-12-01', prazo_relativo_dias: 0, trecho: 'T1', confianca: 0.7 },
          { tipo: 'combinado', descricao: 'Item inventado', responsavel_nome: '', prazo_data: '', prazo_relativo_dias: 0, trecho: 'T99', confianca: 0.5 },
        ],
      }),
    })
    const r = await extrairDeTrechos({ trechos, dataEvento: '2026-11-05', formato: 'gemini_notas', cliente, modelo: 'rapido' })
    expect(r.itens).toHaveLength(3)
    expect(r.itens[0]).toMatchObject({ trecho_id: idProximas, prazo: '2026-11-10', prazo_origem: 'relativo', responsavel_nome: 'Ana Faria' })
    expect(r.itens[1]).toMatchObject({ prazo: '2026-11-20', prazo_origem: 'texto', confianca: 1 })
    expect(r.itens[2]).toMatchObject({ tipo: 'tema', prazo: null })
    expect(r.alertas).toContain('extracao_sem_trecho:T99')
    expect(cliente.chamadas[0]?.sistema[0]?.texto).toContain('Próximas etapas')
  })

  it('sem trechos, nem chama o modelo', async () => {
    const cliente = new ModeloSimulado({})
    const r = await extrairDeTrechos({ trechos: [], dataEvento: null, formato: 'texto', cliente, modelo: 'rapido' })
    expect(r.itens).toEqual([])
    expect(cliente.chamadas).toHaveLength(0)
  })
})
