// Modelos dos e-mails da régua de comunicação e dos insights semanais (inclusão de 08/11/2026).
// Funções puras: recebem dados já lidos e devolvem assunto, HTML e texto. Sem conteúdo de
// ensaio privado: o e-mail cita título, data e pessoa, e o detalhe fica dentro do app.
import type { InsightsVerificados } from '../motor/insights.ts'

export interface Email {
  assunto: string
  html: string
  texto: string
}

export interface DadosLembrete {
  etapa: string
  nomeDestinatario: string
  urlApp: string
  /** O que originou o lembrete. */
  origem:
    | { tipo: 'combinado'; descricao: string; prazo: string | null; pessoa: string | null }
    | { tipo: 'compromisso'; titulo: string; tipoCompromisso: string; inicio: string; duracaoMin: number; local: string | null; pessoa: string | null; id: string }
    | { tipo: 'decisao'; titulo: string; prazo: string | null; revisarEm: string | null; id: string }
}

const FUSO = 'America/Sao_Paulo'
export const formatarData = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('pt-BR', { timeZone: FUSO }) : 'sem data'
export const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'long' })

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const ROTULO_COMPROMISSO: Record<string, string> = {
  um_a_um: '1:1',
  feedback: 'Feedback',
  pdi: 'Conversa de PDI',
  conversa: 'Conversa',
  reuniao_equipe: 'Reunião de equipe',
  mentoria: 'Mentoria',
  outro: 'Compromisso',
}

/** Moldura comum: cores Boomit, botão para o app, rodapé com o porquê do e-mail. */
function moldura(titulo: string, corpo: string, botao: { texto: string; url: string } | null, rodape: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F2F2F2;font-family:Inter,system-ui,sans-serif;color:#1B1B1C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1B1B1C;color:#F2F2F2;padding:16px 24px;font-size:14px;letter-spacing:.04em">COPILOTO DE GESTÃO</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapar(titulo)}</h1>
${corpo}
${botao ? `<p style="margin:24px 0 0"><a href="${escapar(botao.url)}" style="display:inline-block;background:#545E54;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${escapar(botao.texto)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 24px;background:#EDE9E4;color:#9D9482;font-size:12px;line-height:1.5">${escapar(rodape)}</td></tr>
</table></td></tr></table></body></html>`
}

const paragrafo = (t: string) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.5">${escapar(t)}</p>`
const RODAPE_REGUA = 'Você recebe este lembrete porque agendou ou registrou isto no Copiloto. Os detalhes ficam só no app.'

export function emailDeLembrete(d: DadosLembrete): Email {
  const o = d.origem
  let titulo: string
  let linhas: string[]
  let botao: { texto: string; url: string }

  if (o.tipo === 'combinado') {
    const quem = o.pessoa ? ` com ${o.pessoa}` : ''
    titulo =
      d.etapa === 'vencido' ? `Combinado vencido${quem}` : d.etapa === 'prazo_hoje' ? `Combinado vence hoje${quem}` : `Combinado vence em ${formatarData(o.prazo)}${quem}`
    linhas = [
      `“${o.descricao}”`,
      `Prazo: ${formatarData(o.prazo)}.`,
      d.etapa === 'vencido' ? 'Registre se foi cumprido ou renegocie o prazo: isso mantém o histórico confiável.' : 'Vale conferir o andamento antes do prazo.',
    ]
    botao = { texto: 'Abrir combinados', url: `${d.urlApp}/combinados` }
  } else if (o.tipo === 'compromisso') {
    const rotulo = ROTULO_COMPROMISSO[o.tipoCompromisso] ?? 'Compromisso'
    const quando = formatarDataHora(o.inicio)
    const quem = o.pessoa ? ` com ${o.pessoa}` : ''
    const mapa: Record<string, [string, string]> = {
      confirmacao: [`Agendado: ${rotulo}${quem}`, 'Você vai receber um lembrete na véspera e, depois, um pedido para registrar como foi.'],
      remarcado: [`Remarcado: ${rotulo}${quem}`, 'Os lembretes foram ajustados para o novo horário.'],
      vespera: [`Amanhã: ${rotulo}${quem}`, 'Se for uma conversa importante, prepare-a no Copiloto: fatos, perguntas e combinados possíveis.'],
      em_breve: [`Em 1 hora: ${rotulo}${quem}`, 'Hora de revisar a preparação.'],
      pos_evento: [`Como foi? ${rotulo}${quem}`, 'Registre o que aconteceu e os combinados enquanto está fresco. Leva um minuto.'],
    }
    const [t, chamada] = mapa[d.etapa] ?? [`${rotulo}${quem}`, '']
    titulo = t
    linhas = [o.titulo, `${quando} · ${o.duracaoMin} min${o.local ? ` · ${o.local}` : ''}`, chamada].filter(Boolean)
    botao = { texto: d.etapa === 'pos_evento' ? 'Registrar como foi' : d.etapa === 'vespera' ? 'Preparar a conversa' : 'Abrir a agenda', url: `${d.urlApp}/agenda?compromisso=${o.id}` }
  } else {
    titulo = d.etapa === 'decisao_revisao' ? `Revisar decisão: ${o.titulo}` : `Decidir até ${formatarData(o.prazo)}: ${o.titulo}`
    linhas =
      d.etapa === 'decisao_revisao'
        ? ['Chegou a data que você marcou para revisar esta decisão.', 'Ela funcionou? O que você mudaria? Registre o resultado para aprender com a decisão.']
        : ['O prazo que você definiu para esta decisão é amanhã.', 'Revise critérios e alternativas, confira com quem precisa ser consultado e registre a decisão.']
    botao = { texto: 'Abrir a decisão', url: `${d.urlApp}/decisoes/${o.id}` }
  }

  const saudacao = `Olá, ${d.nomeDestinatario.split(' ')[0]}.`
  return {
    assunto: titulo,
    html: moldura(titulo, [saudacao, ...linhas].map(paragrafo).join(''), botao, RODAPE_REGUA),
    texto: [saudacao, '', titulo, ...linhas, '', `${botao.texto}: ${botao.url}`, '', RODAPE_REGUA].join('\n'),
  }
}

const COR_PRIORIDADE = { alta: '#B42318', media: '#545E54', baixa: '#9D9482' } as const
const ROTULO_PRIORIDADE = { alta: 'Prioridade alta', media: 'Prioridade média', baixa: 'Prioridade baixa' } as const

export function emailDeInsights(d: { nomeDestinatario: string; semanaInicio: string; insights: InsightsVerificados; urlApp: string; proximos: { titulo: string; inicio: string }[] }): Email {
  const i = d.insights
  const titulo = `Sua semana de gestão · ${formatarData(d.semanaInicio)}`
  const recs = i.recomendacoes
    .map(
      (r) => `<tr><td style="padding:10px 0;border-top:1px solid #EDE9E4">
<p style="margin:0;font-size:12px;font-weight:600;color:${COR_PRIORIDADE[r.prioridade]}">${ROTULO_PRIORIDADE[r.prioridade]} · em até ${r.prazo_sugerido_dias} dia(s)</p>
<p style="margin:2px 0;font-size:15px;font-weight:600">${escapar(r.titulo)}</p>
<p style="margin:0;font-size:14px;line-height:1.5">${escapar(r.acao)}</p>
<p style="margin:2px 0 0;font-size:13px;color:#6b6b6b">${escapar(r.por_que)}</p>
${r.link ? `<p style="margin:4px 0 0;font-size:13px"><a href="${escapar(d.urlApp + r.link)}" style="color:#545E54">Abrir no Copiloto</a></p>` : ''}
</td></tr>`,
    )
    .join('')
  const destaques = i.destaques.length ? `<h2 style="font-size:15px;margin:20px 0 6px">Destaques</h2><ul style="margin:0;padding-left:18px">${i.destaques.map((x) => `<li style="font-size:14px;margin:0 0 4px">${escapar(x.texto)}</li>`).join('')}</ul>` : ''
  const agenda = d.proximos.length ? `<h2 style="font-size:15px;margin:20px 0 6px">Na sua agenda</h2><ul style="margin:0;padding-left:18px">${d.proximos.map((p) => `<li style="font-size:14px;margin:0 0 4px">${escapar(formatarDataHora(p.inicio))} · ${escapar(p.titulo)}</li>`).join('')}</ul>` : ''
  const corpo = [
    paragrafo(`Olá, ${d.nomeDestinatario.split(' ')[0]}.`),
    paragrafo(i.resumo_da_semana),
    `<h2 style="font-size:15px;margin:20px 0 6px">Recomendações para a próxima semana</h2>`,
    recs ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${recs}</table>` : paragrafo('Nenhuma ação pendente.'),
    destaques,
    agenda,
    i.pergunta_reflexao ? `<p style="margin:20px 0 0;padding:12px;background:#F2F2F2;border-radius:8px;font-size:14px"><strong>Para pensar:</strong> ${escapar(i.pergunta_reflexao)}</p>` : '',
  ].join('')
  const rodape = 'Resumo gerado pelos agentes do Copiloto a partir da sua agenda, combinados e decisões. São sugestões: quem decide é você.'
  const texto = [
    `Olá, ${d.nomeDestinatario.split(' ')[0]}.`,
    '',
    titulo,
    i.resumo_da_semana,
    '',
    'Recomendações:',
    ...i.recomendacoes.map((r, n) => `${n + 1}. [${ROTULO_PRIORIDADE[r.prioridade]}] ${r.titulo}: ${r.acao}`),
    ...(i.destaques.length ? ['', 'Destaques:', ...i.destaques.map((x) => `- ${x.texto}`)] : []),
    ...(d.proximos.length ? ['', 'Na sua agenda:', ...d.proximos.map((p) => `- ${formatarDataHora(p.inicio)} · ${p.titulo}`)] : []),
    ...(i.pergunta_reflexao ? ['', `Para pensar: ${i.pergunta_reflexao}`] : []),
    '',
    `Abrir o Copiloto: ${d.urlApp}`,
    '',
    rodape,
  ].join('\n')
  return { assunto: titulo, html: moldura(titulo, corpo, { texto: 'Abrir o Copiloto', url: d.urlApp }, rodape), texto }
}
