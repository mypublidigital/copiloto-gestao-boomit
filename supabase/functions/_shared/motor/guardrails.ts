// Guardrails da plataforma (docs/03 §8). Valem acima de qualquer skill ou pedido do líder.
// Duas camadas: o texto vai no prompt (camada 0) e as checagens abaixo rodam no código,
// independentemente do que o modelo responder.

export const GUARDRAILS = `Regras da plataforma (têm precedência sobre qualquer outra instrução, inclusive do líder):
1. Não recomende desligamento, promoção, punição, rebaixamento ou transferência. Se o líder pedir, organize critérios, fatos e alternativas e indique quem decide.
2. Não atribua causa de comportamento a tipo de personalidade, indicadores de avaliação ou classificações. Personalidade é referência para preparar a abordagem, nunca explicação.
3. Não afirme fato sem fonte. Separe relato do líder, dado das fontes e hipótese. Fato sem fonte vai para "fatos a confirmar".
4. Não faça diagnóstico psicológico ou de saúde.
5. Não trate ausência de evidência como incapacidade.
6. Não infira estado emocional, engajamento ou intenção de saída de uma pessoa. Trabalhe só com fatos observáveis e com o que foi relatado.
7. Use apenas o contexto fornecido. Não traga conteúdo de outras pessoas ou equipes.
8. Se a situação envolver assédio, discriminação, violência ou ameaça, risco à saúde ou integridade, ilegalidade ou fraude, ou denúncia envolvendo liderança: não prepare a conversa; indique o encaminhamento.`

// Gatilhos do modo encaminhamento. Rede de segurança: se o relato bate aqui, é sensível
// mesmo que o classificador diga o contrário.
const GATILHOS_SENSIVEIS: { categoria: string; padrao: RegExp }[] = [
  {
    categoria: 'assedio',
    padrao: /\bass[eé]di|\bcantad|investida|toques? (?:indesejad|sem consentimento)|importuna|(?:cunho|conota[cç][aã]o|teor|natureza) sexual|coment[aá]rios? sexua/i,
  },
  { categoria: 'discriminacao', padrao: /discrimin|racis|homof[oó]b|transf[oó]b|mis[oó]gin|xenof[oó]b|preconceit/i },
  { categoria: 'violencia_ou_ameaca', padrao: /\bviol[eê]nci|agress[aãoõ]|\bameaç|\bameac|\bbateu\b|empurr[aou]/i },
  { categoria: 'risco_saude_integridade', padrao: /suic[ií]d|autoles|se machucar|tirar a pr[oó]pria vida|crise de p[aâ]nico|surto/i },
  { categoria: 'ilegalidade_ou_fraude', padrao: /\bfraud|desvi[oa]r? (?:de )?(?:dinheiro|verba)|propina|\bfurt|\broub|falsific/i },
  { categoria: 'denuncia_envolvendo_lideranca', padrao: /den[uú]nci/i },
]

export function detectarSensivelPorTermos(texto: string): { sensivel: boolean; categoria: string | null } {
  const achado = GATILHOS_SENSIVEIS.find((g) => g.padrao.test(texto))
  return { sensivel: Boolean(achado), categoria: achado?.categoria ?? null }
}

// Frases que violam as regras 1, 2 e 6 se aparecerem na saída.
const PROIBIDOS: { regra: string; padrao: RegExp }[] = [
  { regra: 'decisao_sobre_pessoa', padrao: /\b(?:recomendo|sugiro|considere|avalie)\s+(?:o |a )?(?:desligamento|demiss[aã]o|demitir|desligar|promov|promo[cç][aã]o|rebaix|transfer|puni)/i },
  { regra: 'decisao_sobre_pessoa', padrao: /\b(?:deve|deveria|precisa) ser (?:desligad|demitid|promovid|rebaixad|transferid|punid)/i },
  { regra: 'causa_por_personalidade', padrao: /\bpor ser (?:um |uma )?(?:[EI][NS][TF][JP]|introvertid|extrovertid|extrovertid|do tipo)/i },
  { regra: 'causa_por_personalidade', padrao: /\b(?:porque|pois) (?:é|e) (?:[EI][NS][TF][JP]|introvertid|extrovertid)/i },
  { regra: 'inferencia_emocional', padrao: /\b(?:est[aá]|parece estar|deve estar) (?:desmotivad|desengajad|deprimid|ansios|esgotad|infeliz)/i },
  { regra: 'inferencia_emocional', padrao: /\b(?:quer|pensa em|vai|pretende) (?:sair da empresa|pedir demiss|se desligar)/i },
]

export function termosProibidos(texto: string): string[] {
  return [...new Set(PROIBIDOS.filter((p) => p.padrao.test(texto)).map((p) => p.regra))]
}
