// Leitura de documentos enviados como fonte (Sprint 4, docs/02 §4): extrai texto de .txt, .md,
// .vtt, .docx e .pdf, detecta o formato (anotações do Gemini × transcrição) e divide em trechos.
import { strFromU8, unzipSync } from 'fflate'
import { extractText, getDocumentProxy } from 'unpdf'

export type FormatoArquivo = 'txt' | 'md' | 'vtt' | 'docx' | 'pdf'
export type FormatoConteudo = 'gemini_notas' | 'transcricao' | 'texto'

export const EXTENSOES_ACEITAS: FormatoArquivo[] = ['txt', 'md', 'vtt', 'docx', 'pdf']

export function formatoDoArquivo(nome: string): FormatoArquivo | null {
  const ext = nome.toLowerCase().split('.').pop() ?? ''
  return (EXTENSOES_ACEITAS as string[]).includes(ext) ? (ext as FormatoArquivo) : null
}

/** VTT → linhas "Locutor: fala", preservando o locutor de <v Nome> quando existir. */
export function textoDeVtt(vtt: string): string {
  const linhas: string[] = []
  for (const bloco of vtt.replace(/\r/g, '').split(/\n\n+/)) {
    const partes = bloco.split('\n').filter((l) => l.trim() && !/^WEBVTT/.test(l) && !/-->/.test(l) && !/^\d+$/.test(l.trim()) && !/^NOTE\b/.test(l))
    if (!partes.length) continue
    const fala = partes.join(' ')
    const voz = /^<v(?:\.[^ >]+)?\s+([^>]+)>(.*)$/.exec(fala)
    linhas.push(voz ? `${voz[1]!.trim()}: ${voz[2]!.replace(/<\/v>/g, '').trim()}` : fala.replace(/<[^>]+>/g, '').trim())
  }
  return linhas.join('\n')
}

/** DOCX (zip) → texto dos parágrafos de word/document.xml. */
export function textoDeDocx(bytes: Uint8Array): string {
  const arquivos = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' })
  const xml = arquivos['word/document.xml']
  if (!xml) throw new Error('Arquivo .docx sem word/document.xml')
  return strFromU8(xml)
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extrairTexto(bytes: Uint8Array, formato: FormatoArquivo): Promise<string> {
  switch (formato) {
    case 'txt':
    case 'md':
      return new TextDecoder('utf-8').decode(bytes).replace(/\r/g, '').trim()
    case 'vtt':
      return textoDeVtt(new TextDecoder('utf-8').decode(bytes))
    case 'docx':
      return textoDeDocx(bytes)
    case 'pdf': {
      const pdf = await getDocumentProxy(bytes)
      const { text } = await extractText(pdf, { mergePages: true })
      return String(text).trim()
    }
  }
}

// Linha de fala: "Nome Sobrenome: texto" (com tempo opcional antes, como "[00:01:02]").
const FALA = /^\s*(?:\[?\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\]?\s*[-–]?\s*)?([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.'-]*(?: [A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.'-]*){0,3}):\s+(.+)$/

export function detectarFormato(texto: string): FormatoConteudo {
  if (/^\s*#*\s*(Próximas etapas|Próximos passos|Next steps)\s*$/im.test(texto)) return 'gemini_notas'
  const falas = texto.split('\n').filter((l) => FALA.test(l)).length
  return falas >= 3 ? 'transcricao' : 'texto'
}

export interface TrechoBruto {
  ordem: number
  locutor: string | null
  inicio_seg: number | null
  texto: string
}

const segundos = (t: string | undefined) => {
  if (!t) return null
  const p = t.split(':').map(Number)
  return p.length === 3 ? p[0]! * 3600 + p[1]! * 60 + p[2]! : p[0]! * 60 + p[1]!
}

/** Trechos de até ~1.500 caracteres; na transcrição, por turnos de fala; nas notas do Gemini, "Próximas etapas" fica separado. */
export function dividirEmTrechos(texto: string, formato: FormatoConteudo, limite = 1500): TrechoBruto[] {
  const trechos: TrechoBruto[] = []
  const fechar = (linhas: string[], locutores: Set<string>, inicio: number | null) => {
    const t = linhas.join('\n').trim()
    if (t) trechos.push({ ordem: trechos.length + 1, locutor: locutores.size === 1 ? [...locutores][0]! : null, inicio_seg: inicio, texto: t })
  }

  if (formato === 'transcricao') {
    let atual: string[] = []
    let locutores = new Set<string>()
    let inicio: number | null = null
    for (const linha of texto.split('\n')) {
      const m = FALA.exec(linha)
      if (atual.join('\n').length + linha.length > limite && atual.length) {
        fechar(atual, locutores, inicio)
        atual = []
        locutores = new Set()
        inicio = null
      }
      if (m) {
        locutores.add(m[2]!)
        inicio ??= segundos(m[1])
      }
      if (linha.trim()) atual.push(linha.trim())
    }
    fechar(atual, locutores, inicio)
    return trechos
  }

  // Notas e texto: por blocos (linha em branco ou título), "Próximas etapas" em trecho próprio.
  const blocos = texto.split(/\n\s*\n|\n(?=#+ |(?:Próximas etapas|Próximos passos|Next steps)\s*$)/im).map((b) => b.trim()).filter(Boolean)
  let atual: string[] = []
  for (const bloco of blocos) {
    const ehProximas = /^(?:#+\s*)?(Próximas etapas|Próximos passos|Next steps)\b/i.test(bloco)
    if (ehProximas || (atual.join('\n\n').length + bloco.length > limite && atual.length)) {
      fechar(atual, new Set(), null)
      atual = []
    }
    if (bloco.length > limite) {
      for (let i = 0; i < bloco.length; i += limite) fechar([bloco.slice(i, i + limite)], new Set(), null)
      continue
    }
    atual.push(bloco)
    if (ehProximas) {
      fechar(atual, new Set(), null)
      atual = []
    }
  }
  fechar(atual, new Set(), null)
  return trechos
}

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Pessoas citadas: nome completo, ou primeiro nome quando ele é único na equipe. O líder confirma. */
export function sugerirPessoas(texto: string, pessoas: { id: string; nome: string }[]): string[] {
  const alvo = ` ${semAcento(texto).replace(/[^a-z0-9]+/g, ' ')} `
  const primeiro = (n: string) => semAcento(n).split(' ')[0] ?? ''
  const contagem = new Map<string, number>()
  for (const p of pessoas) contagem.set(primeiro(p.nome), (contagem.get(primeiro(p.nome)) ?? 0) + 1)
  return pessoas
    .filter((p) => {
      const completo = semAcento(p.nome).replace(/[^a-z0-9]+/g, ' ').trim()
      if (alvo.includes(` ${completo} `)) return true
      const nome = primeiro(p.nome)
      return nome.length >= 3 && contagem.get(nome) === 1 && alvo.includes(` ${nome} `)
    })
    .map((p) => p.id)
}
