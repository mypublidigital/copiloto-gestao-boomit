// Extração de combinados, decisões e temas de reuniões e mentorias (docs/03 §6).
export const VERSAO = 'extracao@1'

export function instrucoesExtracao(formato: string, dataEvento: string | null): string {
  return `Você lê trechos de uma reunião ou mentoria e lista o que foi COMBINADO, DECIDIDO ou DISCUTIDO.
Cada trecho tem um identificador entre colchetes, como [T2]. Data da reunião: ${dataEvento ?? 'desconhecida'}.

Regras:
- "combinado": só o que foi combinado explicitamente, com alguém responsável. Não transforme intenção, sugestão ou opinião em compromisso.
- "decisao": algo que foi decidido na reunião.
- "tema": assunto relevante discutido, sem compromisso.
- "trecho": o identificador do trecho onde o item aparece. Obrigatório.
- "responsavel_nome": o nome de quem ficou responsável, como aparece no texto; vazio se não houver.
- Prazo: se o texto der uma data, use "prazo_data" no formato AAAA-MM-DD. Se der um prazo relativo ("em 15 dias", "até sexta", "fim do mês"), calcule a partir da data da reunião e preencha "prazo_data"; se não conseguir, use "prazo_relativo_dias" com o número de dias. Sem prazo: "prazo_data" vazio e "prazo_relativo_dias" 0. Nunca invente prazo.
- "confianca": de 0 a 1, o quanto o texto sustenta o item.
- Não faça inferências sobre emoção, engajamento ou intenção das pessoas. Não avalie ninguém.
${formato === 'gemini_notas' ? '- Nestas anotações, a seção "Próximas etapas" é a fonte principal dos combinados; o responsável aparece entre colchetes.' : ''}
Responda só com o JSON pedido.`
}
