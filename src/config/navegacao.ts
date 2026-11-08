import type { LucideIcon } from 'lucide-react'
import { BookOpen, CalendarDays, Compass, FileStack, Gauge, LayoutDashboard, Mail, Network, Scale, ShieldAlert, Sprout } from 'lucide-react'

export type SecaoNavegacao = {
  caminho: string
  titulo: string
  descricao: string
  icone: LucideIcon
  /** Tem página própria (não usa a página genérica de seção). */
  propria?: boolean
}

// Ordem definida no Prompt 0 (docs/04): visão geral, as seis frentes de gestão e fontes.
// Inclusões de 08/11/2026: agenda, decisões e lembretes/insights logo depois da visão geral.
export const SECOES: SecaoNavegacao[] = [
  { caminho: '/', titulo: 'Visão geral', descricao: 'Sua equipe, próximos combinados e o que pede atenção.', icone: LayoutDashboard, propria: true },
  { caminho: '/agenda', titulo: 'Agenda', descricao: 'Dia, semana e mês: o que está agendado e o que foi realizado.', icone: CalendarDays, propria: true },
  { caminho: '/decisoes', titulo: 'Decisões', descricao: 'Apoio para decidir: critérios, alternativas, riscos e alçada.', icone: Scale, propria: true },
  { caminho: '/comunicacao', titulo: 'Lembretes e insights', descricao: 'Régua de e-mails e os insights da semana.', icone: Mail, propria: true },
  { caminho: '/desempenho', titulo: 'Desempenho', descricao: 'Feedbacks e acompanhamento de entregas.', icone: Gauge },
  { caminho: '/desenvolvimento', titulo: 'Desenvolvimento', descricao: 'PDI e conversas de desenvolvimento.', icone: Sprout },
  { caminho: '/comportamento', titulo: 'Comportamento', descricao: 'Conversas difíceis e alinhamento de conduta.', icone: Compass },
  { caminho: '/organizacao', titulo: 'Organização', descricao: 'Prioridades, papéis e decisões na alçada.', icone: Network },
  { caminho: '/crises', titulo: 'Crises', descricao: 'Situações sensíveis e encaminhamentos.', icone: ShieldAlert },
  { caminho: '/lideranca', titulo: 'Liderança', descricao: 'A sua prática como líder e a lente da empresa.', icone: BookOpen },
  { caminho: '/fontes', titulo: 'Fontes e evidências', descricao: 'Reuniões, mentorias e documentos que alimentam o contexto.', icone: FileStack, propria: true },
]
