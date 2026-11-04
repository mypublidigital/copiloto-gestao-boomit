// Classificação do relato (modelo rápido): frente, sensibilidade e o que falta saber.
export const VERSAO = 'classificacao@1'

export const INSTRUCOES = `Você classifica relatos que um líder escreve antes de uma conversa de gestão de pessoas.
Responda só com o JSON pedido.

- "sensivel" = true quando o relato indica assédio moral ou sexual, discriminação, violência ou ameaça, risco à saúde ou integridade de alguém (inclui sofrimento emocional intenso ou menção a autolesão), ilegalidade ou fraude, ou denúncia envolvendo liderança. Na dúvida entre sensível e não sensível, marque sensível.
- "categoria_sensivel": a categoria correspondente, ou "nenhuma".
- "motivo_sensivel": uma frase curta e neutra explicando o porquê (vazio se não for sensível).
- "frente": a frente de gestão que melhor descreve o relato.
- "informacoes_faltantes": até 3 informações objetivas que ajudariam a preparar a conversa (datas, exemplos, combinados anteriores). Não peça opinião sobre a pessoa.`
