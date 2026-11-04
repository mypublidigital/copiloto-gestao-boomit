import type { LucideIcon } from 'lucide-react'
import { BookOpen, Compass, FileStack, Gauge, LayoutDashboard, Network, ShieldAlert, Sprout } from 'lucide-react'

export type SecaoNavegacao = {
  caminho: string
  titulo: string
  descricao: string
  icone: LucideIcon
}

// Ordem definida no Prompt 0 (docs/04): visão geral, as seis frentes de gestão e fontes.
export const SECOES: SecaoNavegacao[] = [
  { caminho: '/', titulo: 'Visão geral', descricao: 'Sua equipe, próximos combinados e o que pede atenção.', icone: LayoutDashboard },
  { caminho: '/desempenho', titulo: 'Desempenho', descricao: 'Feedbacks e acompanhamento de entregas.', icone: Gauge },
  { caminho: '/desenvolvimento', titulo: 'Desenvolvimento', descricao: 'PDI e conversas de desenvolvimento.', icone: Sprout },
  { caminho: '/comportamento', titulo: 'Comportamento', descricao: 'Conversas difíceis e alinhamento de conduta.', icone: Compass },
  { caminho: '/organizacao', titulo: 'Organização', descricao: 'Prioridades, papéis e decisões na alçada.', icone: Network },
  { caminho: '/crises', titulo: 'Crises', descricao: 'Situações sensíveis e encaminhamentos.', icone: ShieldAlert },
  { caminho: '/lideranca', titulo: 'Liderança', descricao: 'A sua prática como líder e a lente da empresa.', icone: BookOpen },
  { caminho: '/fontes', titulo: 'Fontes e evidências', descricao: 'Reuniões, mentorias e documentos que alimentam o contexto.', icone: FileStack },
]
