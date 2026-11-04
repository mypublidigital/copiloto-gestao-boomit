// Rótulos e regras dos documentos-fonte (Sprint 4).
import type { Database } from '@/tipos/banco'

export type TipoDocumento = Database['public']['Enums']['tipo_documento']
export const ROTULO_TIPO_DOC: Record<TipoDocumento, string> = {
  anotacao_reuniao: 'Anotações de reunião (ex.: Gemini)',
  transcricao_reuniao: 'Transcrição de reunião',
  transcricao_mentoria: 'Transcrição de mentoria',
  documento: 'Documento',
  nota: 'Nota',
}
export const EXIGE_AVISO = new Set<TipoDocumento>(['anotacao_reuniao', 'transcricao_reuniao', 'transcricao_mentoria'])
export const ROTULO_STATUS_DOC: Record<string, string> = { recebido: 'Na fila', processando: 'Processando', processado: 'Pronto para revisar', erro: 'Erro' }
