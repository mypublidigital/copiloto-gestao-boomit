// Personas fictícias do modo demonstração (roteiro do docs/04). Usadas pelo seed
// (scripts/seed-demo.ts) e pelo seletor de persona, que só existe com VITE_MODO_DEMO=true.
// Os líderes apontam para colaboradores de fixtures/boomit/ pelo e-mail.

export type PapelPersona = 'lider' | 'admin_empresa' | 'mentor'

export interface Persona {
  chave: string
  nome: string
  descricao: string
  email: string
  papel: PapelPersona
  /** E-mail do colaborador (no fixture) que esta persona é; null para RH e mentor. */
  colaboradorEmail: string | null
  /** Para o mentor: e-mail do líder mentorado. */
  mentoraEmail?: string
}

export const PERSONAS: Persona[] = [
  {
    chave: 'marina',
    nome: 'Marina Costa',
    descricao: 'Líder · 8 pessoas',
    email: 'marina.costa@exemplotech.com',
    papel: 'lider',
    colaboradorEmail: 'marina.costa@exemplotech.com',
  },
  {
    chave: 'ricardo',
    nome: 'Ricardo Alves',
    descricao: 'Diretor · líder de líderes',
    email: 'ricardo.alves@exemplotech.com',
    papel: 'lider',
    colaboradorEmail: 'ricardo.alves@exemplotech.com',
  },
  {
    chave: 'paulo',
    nome: 'Paulo Mendes',
    descricao: 'Outro líder',
    email: 'paulo.mendes@exemplotech.com',
    papel: 'lider',
    colaboradorEmail: 'paulo.mendes@exemplotech.com',
  },
  {
    chave: 'rh',
    nome: 'Admin RH',
    descricao: 'Admin da empresa',
    email: 'admin.rh@exemplotech.com',
    papel: 'admin_empresa',
    colaboradorEmail: null,
  },
  {
    chave: 'mentor',
    nome: 'Mentor Boomit',
    descricao: 'Mentor da Marina',
    email: 'mentor@boomit-demo.example',
    papel: 'mentor',
    colaboradorEmail: null,
    mentoraEmail: 'marina.costa@exemplotech.com',
  },
]
