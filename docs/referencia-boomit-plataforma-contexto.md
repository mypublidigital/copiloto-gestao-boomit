# Boomit Plataforma — Contexto técnico e funcional

> Documento de referência para projetos que irão **ler e interpretar os dados** da Boomit Plataforma (`devolutivaboomit.com`).
> Levantado por navegação no portal do cliente (perfil "cliente/empresa") em 25/10/2026. Não contém dados de nenhum cliente específico — todos os valores citados são exemplos de formato/escala.
> Itens marcados como **(inferido)** foram deduzidos pela interface, não confirmados por documentação ou API.

---

## 1. Visão geral

A Boomit Plataforma é um SaaS de **diagnóstico e desenvolvimento de pessoas e organizações**, com análises e textos gerados por IA. O fluxo de negócio:

1. A empresa-cliente contrata uma **quota de assessments** (1 assessment = 1 colaborador).
2. A empresa (ou a Boomit) cadastra os colaboradores.
3. Cada colaborador percorre uma **Jornada** de 3 etapas:
   - **Assessment** — autoavaliação de competências (comportamentais e táticas/estratégicas) + questionário de maturidade em IA.
   - **Focus** — sessão agendada com um **Mentor Focus** (profissional de RH/carreira), que emite avaliação e pareceres.
   - **Personalidade** — teste de 16 Personalidades (modelo MBTI, com sufixo -A/-T).
4. A plataforma consolida os dados em:
   - **Análise do Colaborador** (relatório individual, 7 abas, exportável em PDF);
   - **Resumo Estratégico da Empresa** (relatório organizacional, 7 abas, exportável em Excel), que conecta gaps de pessoas a metas de negócio e impacto financeiro.
5. Existe uma **devolutiva** (feedback) individual, com data e marcação de "Devolutiva concluída".

### Stack observada (inferido)
- Backend em **Supabase** (mensagens de erro "Failed to send a request to the Edge Function").
- SPA (React/similar), navegação por abas e modais sem mudança de URL na maioria dos casos.
- Identificadores em **UUID v4**.

---

## 2. Rotas (URLs)

| Rota | Conteúdo |
|---|---|
| `/cliente/home` | Painel da empresa (abas: Visão Geral, Colaboradores, Assessments, Relatórios). Abas e modais **não alteram a URL**. |
| `/analise-colaborador/{colaborador_uuid}` | Relatório individual do colaborador (7 abas, sem mudança de URL entre abas). |
| `/empresa/{empresa_uuid}/resumo-estrategico` | Resumo Estratégico organizacional (7 abas, sem mudança de URL entre abas). |

Menu do usuário: "Minha Conta" (e-mail do usuário logado) e "Sair".

---

## 3. Modelo de dados (entidades e campos)

### 3.1 Empresa
| Campo | Tipo | Observação |
|---|---|---|
| id | UUID | usado em `/empresa/{id}/...` |
| nome_fantasia | texto | |
| razao_social | texto | |
| cnpj | texto | formato `00.000.000/0000-00` |
| setor | texto | ex.: "Contabilidade" |
| status | enum | "Ativo" (outros valores não observados) |
| quota_contratada | inteiro | nº de assessments contratados |
| quota_utilizada | inteiro | |
| quota_disponivel | inteiro | contratada − utilizada |
| maturidade_nota | enum | `D`, `C`, `B`, `A`, `AA`, `AAA` |
| maturidade_score | número | ex.: 90, 105 (escala máxima não exibida) |
| progresso_programa_pct | % | % de colaboradores avaliados |
| data_ultima_analise | data | |
| **Contexto financeiro** (input do PPL) | | |
| faturamento_anual | R$ | |
| custo_anual_colaboradores | R$ | |
| lucro_faixa_min / max | R$ | derivado de margem mín/máx |
| **Pontos-chave** (lista, normalmente 3) | | |
| ponto_chave.metrica | texto | ex.: Faturamento, Margem Líquida, Turnover |
| ponto_chave.meta_numerica | texto | ex.: "De X para Y em 12 meses" |
| ponto_chave.desafios_criticos | lista de texto | normalmente 3 por métrica |

### 3.2 Colaborador
| Campo | Tipo | Obrigatório | Valores / observação |
|---|---|---|---|
| id | UUID | — | usado em `/analise-colaborador/{id}` |
| nome_completo | texto | sim | |
| email | e-mail | sim | **não editável** após cadastro (chave natural) |
| celular_whatsapp | texto | não | formato `+55(xx)xxxxx-xxxx` (usado para comunicação via WhatsApp) |
| cargo | texto livre | sim | ex.: "Analista Fiscal Pl" — **sem padronização** (variações de caixa/abreviação) |
| area | enum | não | `Geral`, `Área`, `Regional`, `Unidade`, `Tecnologia`, `Marketing`, `Vendas`, `RH` (rótulo "Recursos Humanos"), `Financeiro`, `Operações`. Na listagem aparecem também valores fora desta lista (ex.: "Diretoria Geral", "Administrativo", "Jurídico", "TI") → campo aceita/recebe valores legados ou de outra origem. |
| nivel_hierarquico | enum | sim | `operacional`, `tatico`, `estrategico` (rótulos: Operacional, Tático, Estratégico) |
| diretoria | enum extensível | não | `Tecnologia`, `Unidade`, `Mercado e Cliente`, `Operações`, `Gente e Gestão`, `Presidência`, `Marketing`, `Vendas` + botão "Adicionar nova diretoria" |
| genero | enum | não | `feminino`, `masculino`, `nao_binario`, `outro` |
| salario | R$ | não | provavelmente usado no cálculo de impacto PPL (inferido) |
| status | enum | — | "Em Jornada" (outros não observados) |
| status_assessment | enum | — | `Concluído`, `Em andamento`, `Pendente`, `Aplicado (aguardando resposta)`, `Não iniciado` |
| data_devolutiva | data | — | exibida na barra lateral do Resumo Estratégico |
| devolutiva_concluida | booleano | — | checkbox |

**Regra de inclusão:** se `quota_disponivel = 0`, a inclusão de colaborador vira **solicitação pendente de aprovação** (não cria direto).

### 3.3 Mentor Focus
| Campo | Observação |
|---|---|
| nome | |
| bio | texto de apresentação |
| linkedin_url | |

### 3.4 Sessão Focus (agendamento)
| Campo | Valores |
|---|---|
| colaborador | ref |
| mentor | ref (inferido) |
| data | |
| status | `Agendado`, `Concluído`, `No-Show`, `Reagendado`, `Cancelado` |
| motivo | texto (ex.: "Não compareceu") |
| observacao | texto livre |

### 3.5 Assessment (resposta do colaborador)
| Campo | Observação |
|---|---|
| data_envio / data_resposta | usados para "tempo de resposta" em dias |
| notas_autoavaliacao | por competência, escala 0–10 |
| respostas_maturidade_ia | geram as 5 dimensões individuais de IA |

### 3.6 Personalidade (16 Personalidades)
| Campo | Valores |
|---|---|
| tipo | 16 tipos MBTI + identidade: ex. `ENFJ-T`, `ENTJ-A` |
| apelido | ex.: "Protagonista" |
| descricao_curta | ex.: "Líderes inspiradores e carismáticos" |
| energia | Extroversão / Introversão |
| mente | Intuição / Observação |
| natureza | Pensamento / Sentimento |
| taticas | Julgamento / Prospecção |
| data_preenchimento | |

---

## 4. Catálogo de competências

### 4.1 Digital de Crescimento (comportamentais — 10)
| Competência | Descrição exibida |
|---|---|
| Inovação | Habilidade para criar soluções novas e diferenciadas |
| Criatividade | Capacidade de gerar soluções inovadoras |
| Foco | Concentração em prioridades e objetivos principais |
| Flexibilidade | Capacidade de se adaptar a diferentes situações |
| Agilidade | Velocidade na execução e tomada de decisões |
| Curiosidade | Interesse em aprender e explorar novos conhecimentos |
| Construção de Planos | Capacidade de criar planejamentos estruturados, traduzindo objetivos em etapas claras, prazos e responsáveis |
| Riscos Calculados | Habilidade para avaliar e assumir riscos de forma inteligente, ponderando potenciais perdas e ganhos |
| Tomada de Decisão | Capacidade de decidir de forma rápida e fundamentada, mesmo com informações limitadas |
| Comunicação Objetiva | Capacidade de transmitir informações de forma clara, direta e adaptada ao contexto |

Cada competência tem 3 valores: **Auto-avaliação**, **Meta Esperada**, **Nota Atual** (escala 0–10).

### 4.2 Táticas Estratégicas (9)
Experiência Profissional · Adaptabilidade · Resolução de Problemas · Conhecimento Técnico · Estratégia de Negócios · Trabalho em Equipe · Conhecimento do Setor · Compreensão Estratégica · Comunicação.

Cada uma tem: **Nota Atual**, **Gap para Esperado**, **Margem até 10** (escala 0–10).

### 4.3 Catálogo bruto (ranking "Melhor Colaborador por Competência")
O relatório Competências Organizacionais expõe chaves **não normalizadas**, que devem ser tratadas com mapeamento/de-para:

`Adaptabilidade`, `Agilidade`, `Colaboracao`, `Comportamental`, `Compreensão Estratégica`, `Comunicação`, `Comunicação Objetiva`, `Comunicacao_eficaz`, `Comunicacao_eficaz_influencia`, `Comunicacaoefetiva`, `Conhecimento Do Setor`, `Conhecimento Técnico`, `Construção De Planos` (aparece 2×), `Criatividade`, `Curiosidade`, `Direcionamento Para Resultados`, `Estratégia De Negócios`, `Flexibilidade`, `Foco`, `Gestao_mudancas`, `Influencia`, `Inovação`, `Melhoria_continua`, `Planejamento Estratégico`, `Proatividade`, `Produtividade`, `Qualidade_do_trabalho`, `Qualidade_trabalho`, `Resiliencia`, `Riscos Calculados`, `Tomada De Decisão`.

Também são citadas em textos de autopercepção: Autoconhecimento, Comunicação Persuasiva, Visão Sistêmica, Liderança, Disciplina, Desenvolvimento de Líderes, Visão Estratégica.

> **Recomendação:** normalizar com `lower()`, remoção de acentos e `_`→espaço, e manter tabela de sinônimos (ex.: `comunicacao_eficaz` ≈ `comunicacaoefetiva` ≈ `comunicação`; `qualidade_trabalho` ≈ `qualidade_do_trabalho`).

---

## 5. Indicadores, escalas e regras de cálculo

### 5.1 PPL — Performance/Potencial Perdido (sigla não expandida na interface)
- **Individual:** escala **0 a −10** (0 = melhor, −10 = pior). Representa perda de performance. Tem data de última atualização.
- **Empresa:** indicador composto (pode passar de −10; ex.: −9,65 exibido com eixo até −11). Considera maturidade organizacional, desafios estratégicos, metas e dados financeiros — "vai além da média individual".
- **PPL médio** da equipe também exibido.
- Ranking "Quem mais impulsiona o PPL": top 3 para cima (PPL mais próximo de 0) e top 3 para baixo.

### 5.2 Impacto financeiro do PPL
Entradas: faturamento anual, custo anual com colaboradores, lucro (faixa mín–máx).
Saída: **perda anual estimada (R$, faixa mín–máx)** = PPL aplicado sobre a margem líquida (mín/máx), quebrada por nível:
- Estratégicos ≈ 50% · Táticos ≈ 30% · Operacionais ≈ 20% da perda total (proporção observada; inferido).

Botão "Recalcular" refaz a estimativa.

### 5.3 Pareto de competências a tratar
- Fórmula exibida: **impacto = gap × √cobertura × peso_categoria**.
- Mostra Top 10 com impacto individual (%) e acumulado (%), marcando as que estão dentro da linha de 80%.

### 5.4 Régua de Posicionamento / Perfil Hierárquico
- Distribuição proporcional do perfil em % entre **Operacional / Tático / Estratégico** (soma 100%).
- "Dominante" (maior fatia) vs "Cargo" (nível cadastrado).
- Empresa: posição atual vs esperada em % e **Gap de Posicionamento** (%).
- Individual: barras "Performance Atual" e "Alcance de Performance" com marcadores **Esperado**, **Atual** e **Potencial**.

### 5.5 Alinhamento de Propósito
- Score em % com 4 dimensões: **Alinhamento Cultural** (valores e cultura), **Performance vs Expectativa** (entrega vs esperado), **Engajamento Comportamental** (motivação e propósito), **Alinhamento Estratégico** (foco nos objetivos).
- Faixa do score geral: **≥85% Altamente Alinhado · 70–84% Bem Alinhado · <70% Precisa de Atenção**.
- Faixa das dimensões (visão empresa): **≥75% Forte · 60–74% Saudável · 40–59% Em desenvolvimento · <40% Crítico**.

### 5.6 Indicador de Potencial
| Item | Escala |
|---|---|
| Adaptabilidade | Baixa / Média / Alta (valor 0–10 na visão consolidada) |
| Interesse em Desenvolvimento | Baixo / Médio / Alto |
| Tempo de Desenvolvimento Estimado | meses. Faixas individuais: Fácil 3–10m · Fácil-Moderado 11–24m · Moderado 25–30m · Difícil 31m+. Faixas na visão empresa: 3–6m · 6–12m · 12–18m · 18+m (**escalas diferentes entre telas**) |
| Esforço | Muito Fácil / Fácil / Moderado / Difícil |

**Fórmula do Interesse (exibida):**
`interesse = 0,40 × Assessment + 0,30 × Insights Comportamentais + 0,20 × Avaliação Mentor + 0,10 × Prioridade`

Consolidado da empresa: Potencial Médio (0–10), nº de colaboradores, nº com **Potencial Crítico**.

### 5.7 Matriz PPL × Performance (Matriz de Dispersão)
- Eixo X: PPL (−11 a 0). Eixo Y: Performance atual / Performance Técnica (%) 0–100.
- Cortes: PPL **−3,5** e **−6,5**; Performance **75%**.

| Quadrante | Regra |
|---|---|
| **Estrelas** | PPL entre 0 e −3,5 (baixa perda) + alta Performance Técnica. Talentos-chave para promoção e projetos estratégicos. |
| **Entregadores** | alta performance, PPL fora da faixa de Estrelas (inferido) |
| **Promessas** | performance abaixo de 75% com PPL moderado (inferido) |
| **Atenção** | PPL entre −6,5 e −11 (alta perda) + Performance Técnica baixa. Avaliar fit, capacitação ou realocação. |

### 5.8 Ações R3 (individual)
Recomendação entre **Desenvolver / Realocar / Promover**, com **% de confiança** e texto justificativo.

### 5.9 Maturidade organizacional
Escala ordinal: **D < C < B < A < AA < AAA**, com score numérico, rótulo (ex.: "Processos estruturados em desenvolvimento"), texto de **Diagnóstico** e de **Próxima Etapa**.

### 5.10 Maturidade em IA — Modelo Centauro
**Individual** (score final 0–10) com 5 dimensões (0–10):
Fluência Digital · Uso Prático de IA · Prontidão Comportamental · Pensamento Analítico · Aderência ao Contexto da Empresa.

Níveis individuais:
| Nível | Nome | Descrição |
|---|---|---|
| N1 | Explorador | Primeiro contato com IA. Uso esporádico, sem rotina nem repertório. |
| N2 | Aprendiz | Usa IA em tarefas pontuais com apoio; depende de orientação. |
| N3 | Usuário | Incorpora IA na rotina com autonomia em casos comuns. |
| N4 | Aplicador | Aplica IA de forma estratégica, combina ferramentas, ganhos consistentes. |
| N5 | Catalisador | Referência interna; cria fluxos, capacita pares, impulsiona a equipe. |

Gauge individual com rótulo qualitativo (ex.: "Fraco").

**Organizacional** — "Aderência de IA" score **0–100**, com 6 eixos (0–10):
Base Tecnológica · Uso Prático · Prontidão de Pessoas · Governança & Risco · Estratégia de IA · Escala & Sustentação.
Nível da empresa no Centauro (ex.: "Centauro Nível 1 — Operacional Ágil — Automação de Tarefas"), Diagnóstico, Próximo Passo, Principais Gaps, data de cálculo.
Radar **Empresa × Equipe** (Governança e Escala só existem no nível organizacional).
Destaques: Média da equipe, Colaborador destaque, Mais aderente, Melhor prontidão (adaptabilidade + interesse).

---

## 6. Telas e outputs em detalhe

### 6.1 Home (`/cliente/home`)
- **Cards:** Total Colaboradores (ativos · avaliados) · Assessments Disponíveis (utilizados de contratados) · Maturidade (nota + score).
- **Visão Geral:** Informações da Empresa (nome fantasia, razão social, CNPJ, setor) · Progresso do Programa (% e nº avaliados).
- **Colaboradores:** cards (Cadastrados, Com Jornada Ativa, Quota Disponível), alerta de quota, busca (nome/e-mail/cargo), tabela (Colaborador+e-mail, Cargo, Área, Nível, Status, Ações=Editar), **Exportar Excel**, **Incluir Colaborador** (campos da seção 3.2).
- **Assessments:**
  - *Gestão de Colaboradores:* tabela (Colaborador, Cargo, Email, Status Assessment, Ação "Ver Relatório"), quota.
  - *Estatísticas Detalhadas:* Colaboradores, Concluídos, Em Andamento, Quota; Progresso Geral (%); Distribuição por Status (Concluídos, Pendentes, Aplicados aguardando resposta, Não Iniciados).
- **Relatórios (modais):**
  | Relatório | Outputs |
  |---|---|
  | Progresso da Jornada | Total, Progresso geral %, Pendentes; por etapa (Assessment, Focus, Personalidade): concluídos/em andamento/pendentes, x/N e % |
  | Aderência ao Focus | Filtro de período; Agendamentos, Concluídos, No-Shows, Reagendamentos, Cancelamentos, Taxa de Aderência %; gráfico mensal de evolução; tabela por colaborador (Agend., Concl., No-Show, Canc., Reag., Taxa); Registro de Ocorrências (nome, tipo, data, motivo, obs.) |
  | Aderência Assessment | Enviados, Respondidos (%), Pendentes, Média de resposta (dias); Top 5 mais rápidos e Top 5 maior tempo (com cargo e dias); menor/média/maior tempo |
  | Competências Organizacionais | Top 3 colaboradores por nº de notas 10 (média geral + lista de competências com nota); Melhor colaborador por competência (nota) |
  | Perfil da Equipe | Perfis mapeados, tipo predominante, nº de tipos diferentes; donut MBTI; detalhamento por tipo (n e %); Distribuição por Temperamento: Analistas (NT), Diplomatas (NF), Sentinelas (SJ), Exploradores (SP) |
  | Psicossocial NR-1 | **Módulo opcional bloqueado** — mapeamento de riscos psicossociais conforme NR-1 (Anexo I, mai/2025). CTA "Entre em contato para contratar". |
  | Resumo Estratégico | Atalho para `/empresa/{id}/resumo-estrategico` |

### 6.2 Análise do Colaborador (`/analise-colaborador/{id}`)
Cabeçalho: nome • cargo · botão **Baixar PDF**.

| Aba | Outputs |
|---|---|
| **Digital Crescimento** | Radar 10 competências (auto-avaliação, meta, nota atual) com "Expandir"; barras Performance Atual e Alcance de Performance (Esperado/Atual/Potencial) |
| **Táticas Estratégicas** | Barras 9 competências (nota, gap, margem); PPL do colaborador + data; Média Atual; Média Esperada; Status Geral (ex.: "N competências abaixo da meta requerem atenção"); detalhamento por competência |
| **Perfil e Alinhamento** | Alinhamento de Propósito (% + rótulo + 4 dimensões); 16 Personalidades (tipo, apelido, descrição, 4 eixos, data) |
| **Indicadores Padrão** | Indicador de Potencial (adaptabilidade, interesse, tempo em meses, esforço; "Ver detalhamento do interesse" com os 4 componentes ponderados); Perfil Hierárquico (dominante, cargo, distribuição %) |
| **Relatório Focus** | Mentor (foto, nome, bio, LinkedIn); **Análise Técnica** (texto por competência tática) e **Análise Comportamental** (texto por competência comportamental), em acordeões |
| **Projeto Performance** | *Individual High Performance Plan* (data de geração). Blocos "Liderança e Gestão – Digital de Crescimento" e "Estratégico" com texto por competência (diagnóstico + ação + pergunta reflexiva). Tabela **Pontos-Chave**: Ponto-chave para desenvolvimento · Desafio específico · **KPI de mensuração** no formato `indicador: valor_atual → valor_meta → trimestre/ano`. **Ações R3** (Desenvolver/Realocar/Promover + confiança % + justificativa) |
| **Maturidade IA** | Nível Centauro + descrição; radar 5 dimensões; gauge 0–10; valores por dimensão |

### 6.3 Resumo Estratégico (`/empresa/{id}/resumo-estrategico`)
Recursos globais: "Voltar para Home", **Ocultar nomes** (anonimização), barra lateral de colaboradores (expansível: data da devolutiva + checkbox "Devolutiva concluída"), **Filtrar Colaboradores** (busca, "Todos cargos", "Todas áreas", "Selecionar visíveis", "Limpar") — o filtro recalcula a visão para o subconjunto selecionado. Cabeçalho: empresa, setor, última análise.

| Aba | Outputs |
|---|---|
| **Resumo Estratégico** | Exportar Excel; tabela Pontos-Chave (Métrica, Meta Numérica, Desafios Críticos); Indicador de Maturidade (D→AAA, score, rótulo, Diagnóstico, Próxima Etapa); Digital de Crescimento – Top 10 (ranking com descrição) |
| **Digital Organizacional** | Visão organizacional das competências comportamentais (**retornou erro de Edge Function nas tentativas**) |
| **Táticas & Estratégicas** | Barras das 9 competências (médias da org.); Alinhamento de Propósito (média %, distribuição Altamente/Bem/Atenção, 4 componentes com faixa); Média Atual, Média Esperada, Gap Médio |
| **PPL Impactos** | PPL Empresa + explicação; Régua de Posicionamento (atual vs esperado, gap %); Pareto Top 10 (nº no Pareto 80%); Quem mais impulsiona o PPL (PPL médio, top 3 ↑ e ↓); **PPL Impactos** (faturamento, custo, lucro, perda anual R$ por nível, Recalcular); **Análise de Impactos PPL** — cards com Impacto (título, texto, tags de competência e nível), Consequência Direta (texto + "Meta afetada"), Sugestão de Solução (título + texto), agrupados por tema; **Indicadores de Potencial Consolidado**; **Análise de Risco Estratégico** (Risco geral %, rótulo, confiança %, Regenerar; risco % por ponto-chave com justificativa e tags); **Estratégias Prioritárias** (#1–#3, título, descrição, 3 ações cada) |
| **Cronograma Macro** | Plano de 6 meses / 6 etapas, data de criação, Objetivo Geral; cada etapa: nome, objetivo, aba de referência, 4 atividades. Etapas padrão: 1 Diagnóstico & Alinhamento → 2 Fundação das Competências Comportamentais → 3 Desenvolvimento Tático → 4 Aceleração de Resultados → 5 Integração & Performance → 6 Consolidação & Sustentabilidade. **Relatório Detalhado** (competências comportamentais e táticas com maior gap: atual / esperado / gap). **Análise de Autopercepção da Equipe** (texto IA com Regenerar): 1. Perfil de autopercepção, 2. Superestimação/subestimação, 3. Pontos de atenção, 4. Recomendações |
| **Matriz Dispersão** | Scatter PPL × Performance com cortes e 4 quadrantes (contagem + lista por quadrante via ícone de olho + tooltip de regra) |
| **Diagnóstico de IA** | Seção 5.10 completa + tabela por colaborador (Score, Nível, Fluência, Uso, Prontidão, Analítico, Aderência) + **Insights de IA — Visão 360** (Diagnóstico, Pontos fortes, Riscos e gargalos, Próximos passos; data/hora de geração; Regenerar) |

---

## 7. Inputs × Outputs (resumo)

| Input | Quem fornece | Alimenta |
|---|---|---|
| Cadastro da empresa | Empresa/Boomit | Cabeçalhos, maturidade |
| Contexto financeiro + pontos-chave | Empresa/Boomit | PPL empresa, impacto R$, risco estratégico, impactos e estratégias |
| Cadastro do colaborador (cargo, nível, área, salário) | Empresa | Metas esperadas, régua, filtros, impacto por nível |
| Autoavaliação (assessment) | Colaborador | Radar, táticas, autopercepção, interesse (40%) |
| Questionário de IA | Colaborador | Maturidade IA individual e equipe |
| Teste 16 Personalidades | Colaborador | Perfil MBTI e temperamentos |
| Sessão Focus + avaliação + pareceres | Mentor | Nota atual, Relatório Focus, interesse (20%), aderência |
| Metas esperadas por cargo/nível, pesos | Boomit (inferido) | Gaps, Pareto, PPL |
| Avaliação de IA da empresa (6 eixos) | Boomit/Empresa (inferido) | Diagnóstico de IA organizacional |

| Output | Nível | Tipo |
|---|---|---|
| PDF Análise do Colaborador | Individual | Arquivo |
| Excel de colaboradores / Resumo Estratégico | Empresa | Arquivo |
| Textos gerados por IA (pareceres, PDI, impactos, riscos, estratégias, autopercepção, insights IA) | Ambos | Texto (regeneráveis) |
| Scores, escalas, rankings, matrizes | Ambos | Numérico/categórico |

---

## 8. Qualidade de dados — cuidados para quem for consumir

1. **Maturidade divergente entre telas:** Home e Resumo Estratégico podem mostrar nota/score diferentes para a mesma empresa (ex.: "C/90" vs "B/105"). Definir qual é a fonte oficial (provável: Resumo Estratégico, mais recente).
2. **Diagnóstico de IA inconsistente:** score individual pode vir idêntico para todos (ex.: 2.0, N1, Uso Prático 0.2), enquanto o texto de Insights 360 cita distribuições diferentes (ex.: "42% no Nível 4"). Os textos de IA podem ter sido gerados sobre dados anteriores — **validar números do texto contra os campos estruturados**. "Colaborador destaque" pode cair no primeiro da lista quando há empate.
3. **Temperamentos MBTI:** tipos SJ (ESFJ, ESTJ, ISFJ…) aparecem no MBTI mas "Sentinelas (SJ)" pode exibir 0. Recalcular a partir do tipo (NT, NF, SJ, SP) em vez de confiar no agregado.
4. **Competências não normalizadas** (seção 4.3) — aplicar de-para.
5. **Campo Área** recebe valores fora do enum do formulário; **Cargo** é texto livre.
6. **Etapa Personalidade** pode constar 0% concluída na Jornada mesmo com MBTI preenchido nos relatórios.
7. **Digital Organizacional** retorna erro de Edge Function de forma recorrente.
8. **Escalas de "Tempo de Desenvolvimento"** diferem entre a tela individual e a consolidada.
9. Projeto Performance referencia uma aba "Analytics Avançados → Oportunidades" que **não existe** no portal do cliente (provável área admin/Boomit).
10. Textos gerados por IA possuem data de geração e podem ser **regenerados** (valores mudam entre leituras).
11. Datas no formato `dd/mm/aaaa`; números com vírgula decimal em alguns pontos (PPL "-3,92") e ponto em outros (notas "6.62") — normalizar.
12. Dados pessoais sensíveis (salário, gênero, perfil psicológico) — tratar conforme LGPD; a própria plataforma oferece "Ocultar nomes".

---

## 9. Sugestão de schema para o projeto consumidor

```yaml
empresa:
  id: uuid
  nome_fantasia: str
  razao_social: str
  cnpj: str
  setor: str
  quota: {contratada: int, utilizada: int}
  maturidade: {nota: D|C|B|A|AA|AAA, score: float, diagnostico: str, proxima_etapa: str}
  financeiro: {faturamento_anual: float, custo_colaboradores: float, lucro_min: float, lucro_max: float}
  pontos_chave: [{metrica: str, meta: str, desafios: [str], risco_pct: float, risco_texto: str}]
  ppl: {valor: float, perda_anual_min: float, perda_anual_max: float,
        por_nivel: {estrategico: [min,max], tatico: [min,max], operacional: [min,max]}}
  posicionamento: {atual_nivel: str, atual_pct: float, esperado_nivel: str, esperado_pct: float, gap_pct: float}
  pareto: [{competencia: str, impacto_pct: float, acumulado_pct: float, no_pareto: bool}]
  alinhamento: {media_pct: float, cultural: float, performance: float, engajamento: float, estrategico: float}
  ia: {score_100: int, nivel_centauro: int, eixos: {base_tecnologica: float, uso_pratico: float,
       prontidao_pessoas: float, governanca_risco: float, estrategia_ia: float, escala_sustentacao: float}}
  cronograma: [{etapa: int, nome: str, objetivo: str, atividades: [str]}]
  estrategias: [{ordem: int, titulo: str, descricao: str, acoes: [str]}]
  textos_ia: {impactos: [...], autopercepcao: str, insights_ia: {...}, gerado_em: datetime}

colaborador:
  id: uuid
  empresa_id: uuid
  nome: str
  email: str
  celular: str?
  cargo: str
  area: str?
  nivel: operacional|tatico|estrategico
  diretoria: str?
  genero: feminino|masculino|nao_binario|outro?
  salario: float?
  status_jornada: str
  etapas: {assessment: status, focus: status, personalidade: status}
  devolutiva: {data: date?, concluida: bool}
  digital_crescimento: [{competencia: str, auto: float, meta: float, atual: float}]   # 10 itens
  taticas: [{competencia: str, atual: float, esperado: float}]                       # 9 itens
  ppl: {valor: float, atualizado_em: date}
  alinhamento: {pct: float, rotulo: str, cultural: float, performance: float, engajamento: float, estrategico: float}
  personalidade: {tipo: str, apelido: str, energia: str, mente: str, natureza: str, taticas: str, data: date}
  potencial: {adaptabilidade: float, interesse: float, tempo_meses: float, esforco: str,
              interesse_componentes: {assessment: float, insights: float, mentor: float, prioridade: float}}
  perfil_hierarquico: {operacional_pct: float, tatico_pct: float, estrategico_pct: float, dominante: str}
  quadrante_matriz: estrelas|entregadores|promessas|atencao
  performance_tecnica_pct: float
  focus: {mentor: {nome: str, linkedin: str}, analise_tecnica: {competencia: texto}, analise_comportamental: {competencia: texto},
          sessoes: [{data: date, status: str, motivo: str?, obs: str?}]}
  pdi: {gerado_em: date, textos: {competencia: texto},
        pontos_chave: [{titulo: str, desafio: str, kpi: str, de: str, para: str, prazo: str}],
        r3: {acao: desenvolver|realocar|promover, confianca_pct: float, justificativa: str}}
  ia: {score: float, nivel: 1-5, fluencia: float, uso_pratico: float, prontidao: float, analitico: float, aderencia: float}
  assessment: {enviado_em: date, respondido_em: date, tempo_resposta_dias: int}
```
