// Substituto de '@/demo' nos builds sem VITE_MODO_DEMO=true (ver vite.config.ts).
// Mesma interface do módulo real, sem nenhum conteúdo de demonstração.
import type * as Demo from './index'

const vazio: typeof Demo = {
  PersonasEntrada: () => null,
  PersonasCabecalho: () => null,
}

export const { PersonasEntrada, PersonasCabecalho } = vazio
