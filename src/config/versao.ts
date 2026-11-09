// O que esta versão é e o que falta para a produção (registro pedido em 08/11/2026).
// - Build de demonstração (VITE_MODO_DEMO=true): versão de DESENVOLVIMENTO para demonstração,
//   com dados fictícios. A faixa no topo e a página /sobre dizem isso.
// - Build de produção: enquanto houver item pendente abaixo, a faixa no topo avisa que a
//   implantação não terminou e a página /sobre lista o que falta. Atualize `concluido` à medida
//   que cada item for resolvido (ids iguais aos de docs/necessidades.md).

export interface PendenciaProducao {
  id: string
  titulo: string
  impacto: string
  responsavel: 'Boomit' | 'EasyJur' | 'Leadrix' | 'Boomit e EasyJur'
  concluido: boolean
}

export const PENDENCIAS_PRODUCAO: PendenciaProducao[] = [
  { id: 'N9/N10', titulo: 'Integração com a Plataforma Boomit (API copiloto-export)', impacto: 'Assessments, Focus, PDI Boomit e maturidade em IA vêm hoje de dados fictícios (conector em modo mock).', responsavel: 'Boomit', concluido: false },
  { id: 'N16', titulo: 'Contrato de tratamento de dados (LGPD) entre Leadrix, Boomit e EasyJur', impacto: 'Sem ele, nenhum dado real da EasyJur pode entrar no sistema.', responsavel: 'Boomit e EasyJur', concluido: false },
  { id: 'N17', titulo: 'Dados da EasyJur: hierarquia real e lista de líderes do piloto', impacto: 'Equipes, vínculos de liderança e usuários são fictícios.', responsavel: 'EasyJur', concluido: false },
  { id: 'N12', titulo: 'Alçadas reais dos gestores', impacto: 'Decisão na alçada e apoio à decisão citam alçadas de exemplo.', responsavel: 'EasyJur', concluido: false },
  { id: 'N18', titulo: 'Canais de encaminhamento reais (RH, jurídico, ética)', impacto: 'Situações sensíveis indicam canais fictícios.', responsavel: 'EasyJur', concluido: false },
  { id: 'N19', titulo: 'Login corporativo (SSO Google Workspace ou link por e-mail)', impacto: 'Na demonstração, as personas entram por senha.', responsavel: 'EasyJur', concluido: false },
  { id: 'N15', titulo: 'Provedor de e-mail transacional', impacto: 'Lembretes e insights semanais ficam na caixa de saída do app, sem envio real.', responsavel: 'Leadrix', concluido: false },
  { id: 'N14', titulo: 'Skills Mentor Vini e Coach de coach (instruções e materiais)', impacto: 'A lente de liderança da Boomit ainda não entra nas preparações.', responsavel: 'Boomit', concluido: false },
  { id: 'N21', titulo: 'Fronteira com o sistema interno de PDI da EasyJur', impacto: 'O PDI segue o modo provisório "PDI Boomit".', responsavel: 'EasyJur', concluido: false },
  { id: 'N20', titulo: 'Visibilidade de PPL, quadrante e R3 para líderes', impacto: 'Indicadores sensíveis ficam ocultos por padrão.', responsavel: 'Boomit e EasyJur', concluido: false },
  { id: 'N13', titulo: 'Formato real das transcrições e anotações de reunião', impacto: 'A leitura de reuniões foi testada com anotações fictícias.', responsavel: 'EasyJur', concluido: false },
  { id: 'Migração', titulo: 'Migração para as contas da Boomit (Supabase, Anthropic com limite de gasto, hospedagem e domínio)', impacto: 'Hoje tudo roda nas contas de desenvolvimento da Leadrix.', responsavel: 'Leadrix', concluido: false },
  { id: 'Marca', titulo: 'Fonte PP Mori licenciada', impacto: 'A interface usa a fonte alternativa (Inter).', responsavel: 'Boomit', concluido: false },
]

export const pendenciasAbertas = () => PENDENCIAS_PRODUCAO.filter((p) => !p.concluido)
