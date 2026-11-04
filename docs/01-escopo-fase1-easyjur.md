# 01 · Escopo da Fase 1 — Piloto EasyJur

**Status:** v0.2 (03/11/2026) — escopo seguindo para validação com a Boomit; desenvolvimento iniciado com dados fictícios.
**Base:** reunião Update Boomit + EasyJur (22/10/2026, anotações do Gemini) · apresentação Copiloto de Gestão Boomit (20/10/2026) · contexto da Plataforma Boomit (25/10/2026).
**Condicionante:** a fronteira com o projeto interno da EasyJur depende da escuta com Luana (§3 e §8). O desenho abaixo foi feito para funcionar em qualquer resposta dela.

---

## 1. O que a reunião deixou definido

| Situação | Conteúdo |
|---|---|
| **Apresentado** (Manu Dubeux) | Copiloto como "segundo cérebro" do líder; simulação prévia e roteiros para feedback, PDI e conflitos; descentralização de melhorias e ajustes de escopo contra o microgerenciamento; uso do acervo da EasyJur (mentorias, reuniões, planejamento); lembretes ativos de combinados; telas de histórico unificado com assessments e mentorias Boomit; visão da gestão superior; fluência em IA em 5 níveis no assessment; seis frentes; governança com registro auditável; fluxo da preparação ao upload da gravação para validar combinados. Fase 1 = rotinas de gestão de pessoas, feedback, PDI e decisões autônomas nas alçadas. Fases 2 e 3 = controles financeiros e planejamento estratégico. |
| **Alinhado** | Incorporar as skills customizadas da EasyJur (**Mentor Vini**, **Coach de coach**) e a perspectiva de liderança do Vinicius Marques. |
| **Em aberto** | Sobreposição com a iniciativa interna que substitui a Cuture (avaliação de desempenho, PDI e metas) — Luana avalia. Questão levantada pelo Vinicius: o problema central é a velocidade de absorção dos líderes, que competem com a entrega operacional. |
| **Próximos passos de Manu que tocam o desenvolvimento** | Integrar as skills internas; alinhar com o desenvolvimento a inserção de informações e feedbacks direto na ferramenta, centralizando histórico e acompanhamento de tarefas. |

## 2. O que a reunião muda no produto

| Sinal da reunião | Decisão de produto proposta |
|---|---|
| Sobreposição com o substituto da Cuture | O Copiloto é **camada de condução** (preparar, simular, registrar, acompanhar), não sistema de registro de avaliação, metas ou PDI formal. PDI desacoplado por configuração (`modo_pdi`). |
| Velocidade de absorção e concorrência com a operação | Três portas de entrada curtas — **Preparar**, **Registrar**, **Subir reunião** — com contexto já carregado da Boomit (o líder não cadastra nada). Métricas de adoção desde o primeiro dia. |
| Skills Mentor Vini e Coach de coach já em uso | Importadas como estão, versionadas, oferecidas dentro dos fluxos. A visão do Vinicius vira a **lente de liderança** da empresa, aplicada a toda orientação. Reduz atrito: os líderes já conhecem essas ferramentas. |
| Inserção direta + histórico + tarefas | Módulos de **Registro**, **Combinados** e **linha do tempo por colaborador**. |
| Lembretes ativos | Combinado com prazo gera lembrete in-app e por e-mail. |
| Upload de gravações para validar combinados | Ingestão de transcrições com extração de combinados e comparação **planejado × combinado na reunião**, sempre com revisão do líder. |
| Gestão superior acompanha o progresso | Painel de andamento por líder: contagens, prazos, encaminhamentos. Sem conteúdo de ensaios. |
| Governança e auditabilidade | Auditoria append-only e fonte citada em toda orientação. |
| "Treinado com o acervo da EasyJur" | Implementado como **recuperação de contexto a cada uso**. Nenhum modelo é treinado com dados da EasyJur — importante para LGPD e para a expectativa do cliente. |
| Fluência em IA (Centauro N1–N5) | Nível exibido na ficha e filtro na equipe para descoberta de talentos; entra no contexto de situações ligadas à adoção de IA. |

## 3. Fronteira com o projeto interno da EasyJur

| Tema | Sistema interno (substituto da Cuture) | Copiloto de Gestão |
|---|---|---|
| Ciclo de avaliação de desempenho, notas, calibração | Sim | **Não** (em nenhum cenário) |
| Cadastro e acompanhamento oficial de metas | Sim | Não; pode ler metas no futuro como contexto |
| PDI formal (registro oficial) | A definir com Luana | Conforme `modo_pdi` |
| Preparar e simular conversas de feedback, PDI e conflito | — | **Sim** (núcleo) |
| Registro do dia a dia (feedbacks, reconhecimentos, alinhamentos) | — | **Sim** |
| Combinados com prazo, lembretes e validação por reunião | — | **Sim** |
| Histórico de assessments e mentorias Boomit | — | **Sim** (consome a Boomit) |
| Apoio a decisões na alçada do gestor | — | **Sim** |

**Três cenários de `modo_pdi`, sem retrabalho de código:**

| Cenário | `modo_pdi` | Comportamento |
|---|---|---|
| Sistema interno cobre PDI | `integrado` | Ações de desenvolvimento guardam `referencia_externa`; o Copiloto prepara a conversa de PDI e exporta combinados. |
| PDI fica no Copiloto | `nativo` | Ações de desenvolvimento vivem no Copiloto. |
| Sistema interno ainda não está pronto (padrão) | `boomit` | Referência ao PDI da Boomit (Projeto Performance) + ações leves no Copiloto. |

## 4. Perfis e permissões

| Perfil | Quem | Vê | Faz |
|---|---|---|---|
| **Líder** | Gestor com equipe | Liderados diretos e indiretos; contexto Boomit deles; as próprias situações; registros e combinados confirmados da sua linha | Prepara, simula, registra, sobe reuniões, confirma combinados |
| **Gestão superior** | Líder de líderes (mesmo perfil, mais níveis abaixo) | Tudo do líder + painel de andamento dos líderes abaixo | Igual ao líder |
| **Mentor Boomit** | Mentor que acompanha o líder | Líder mentorado e equipe dele; situações que o líder compartilhar; transcrições de mentoria | Sobe transcrições de mentoria |
| **Admin da empresa** | RH / People | Pessoas, hierarquia, alçadas, skills, conector, métricas de uso. **Não vê** preparações nem simulações | Configura |
| **Admin Boomit** | Equipe Boomit | Igual ao admin, para suporte | Configura tenants e conector |
| Colaborador liderado | — | Sem acesso na Fase 1 | — |

Regra testada em `supabase/tests/rls_cenario_piloto.sql`.

## 5. Módulos da Fase 1

**M1 · Minha equipe (home do líder)** — cards (pessoas, conversas previstas, PDIs a revisar, mentoria da semana), próximas ações, combinados vencendo, "Em foco na mentoria", entrada "O que você precisa preparar hoje?".
Aceite: abre com dados reais da Boomit sem cadastro manual do líder; cada ação leva ao fluxo certo em um clique.

**M2 · Ficha do colaborador** — contexto Boomit resumido (gaps prioritários, Focus, PDI Boomit, nível de IA, alinhamento, personalidade como referência) e **linha do tempo unificada** (Boomit: assessment, Focus, devolutiva, PDI; Copiloto: registros, situações aplicadas, combinados; reuniões e mentorias vinculadas).
Aceite: cada item mostra origem, data e **natureza** (dado Boomit, ensaio, relato do líder, aplicação, combinado, fonte); ensaio e relato nunca aparecem como aplicação; indicadores sensíveis só aparecem se a empresa autorizar.

**M3 · Preparar situação** — tipos: feedback · PDI · conversa difícil/conflito · decisão na alçada · preparação de 1:1 (Coach de coach). Fluxo: relato curto → contexto selecionado (editável) → plano gerado → edição → salvar versão.
Aceite: plano separa fatos confirmados, fatos a confirmar e hipóteses; todo fato cita fonte; decisão na alçada indica se está dentro do limite e quem consultar.

**M4 · Simular conversa** — interlocutor simulado em três intensidades; debrief com rubrica.
Aceite: debrief aponta trechos e sugestões; não gera nota do líder; não vai para a gestão superior.

**M5 · Registrar** — feedback, reconhecimento, observação, alinhamento, ocorrência, em até três campos; visibilidade privada ou linha de gestão.
Aceite: registro em menos de um minuto; aparece na linha do tempo.

**M6 · Fontes e reuniões** — upload de transcrições e anotações (Meet/Gemini, .vtt, .docx, .pdf, .txt, .md); vínculo a pessoas; extração de combinados, decisões e temas; comparação planejado × combinado.
Aceite: o upload de reunião ou mentoria exige confirmar que os participantes foram avisados; extração entra como pendente; líder confirma, edita ou descarta cada item.

**M7 · Combinados e lembretes** — lista por prazo e pessoa; status aberto, cumprido, renegociado, não cumprido; evidência registrada; lembretes antes do prazo e no vencimento.
Aceite: lembrete enviado sem ação manual; renegociação preserva histórico.

**M8 · Painel da gestão superior** — por líder: situações preparadas e aplicadas, combinados abertos, vencidos e cumpridos no prazo, encaminhamentos.
Aceite: nenhum conteúdo de ensaio aparece; só contagens e prazos.

**M9 · Administração** — hierarquia (import de planilha), alçadas, lente de liderança, skills (importar, testar, aprovar, versionar), conector Boomit (status, última captura, alertas de qualidade), uso e custo por líder.

## 6. Fora do escopo da Fase 1

Controles financeiros (Fase 2) · acompanhamento do planejamento estratégico (Fase 3) · acesso do colaborador liderado · WhatsApp · transcrição de áudio (previsto para a 1.5) · ciclo de avaliação, metas oficiais e calibração · módulo Psicossocial NR-1 · integração com o sistema interno da EasyJur (depende de Luana).

## 7. Métricas do piloto (hipóteses a pactuar com a EasyJur)

| Dimensão | Indicador |
|---|---|
| Adoção | % de líderes ativos por semana · tempo até o primeiro uso |
| Uso | Preparações por líder/semana · % de preparações que viram aplicação registrada |
| Continuidade | % de combinados cumpridos ou renegociados no prazo · tempo entre a conversa e o registro |
| Qualidade | Avaliação útil/não útil do líder · amostra revisada pelo mentor Boomit |
| Custo | Custo de IA por líder ativo/mês |

Metas numéricas só depois da linha de base das primeiras semanas.

## 8. Pendências e decisões

| # | Pendência | Dono provável | Bloqueia |
|---|---|---|---|
| 1 | Fronteira com o projeto interno (PDI, metas, avaliação) | Vinicius → Luana; Manu conduz a escuta | `modo_pdi` final, M3 (PDI) |
| 2 | Arquivos atuais das skills Mentor Vini e Coach de coach (instruções e materiais) | Vinicius | Sprint 5 |
| 3 | Acesso ao repositório Boomit e implementação da Edge Function `copiloto-export` (integração por API decidida em 03/11) | Manu / desenvolvimento Boomit | Sprint 0A e Sprint 1 (o desenvolvimento segue com dados fictícios) |
| 4 | Hierarquia (quem lidera quem) — a Boomit não guarda | RH EasyJur | M1, M8, permissões |
| 5 | Exibir PPL, quadrante e R3 aos líderes? | Luana | M2 |
| 6 | Base legal, retenção, papéis de tratamento e contratos de dados entre EasyJur, Boomit e fornecedores | Jurídicos | Início do piloto |
| 7 | Login: SSO Google Workspace ou link por e-mail | TI EasyJur | Sprint 0 |
| 8 | Alçadas dos gestores (o que decidem sozinhos) | Vinicius / RH | M3 (decisão na alçada) |
| 9 | Ferramenta de reunião e formato das transcrições | TI EasyJur | M6 |
| 10 | Canais de encaminhamento (RH, jurídico, canal de ética) | RH EasyJur | Modo encaminhamento |
| 11 | Líderes participantes do piloto | Vinicius | Sprint 7 |
| 12 | Contrato de tratamento de dados enquanto o produto estiver nas contas da Leadrix (antes de qualquer dado real) | Leadrix, Boomit e EasyJur | Carga de dados reais |
| 13 | Plano e data da migração das contas Leadrix para as contas Boomit | Leadrix e Boomit | Operação do piloto |

## 9. Decisões registradas

| Data | Decisão | Origem |
|---|---|---|
| 22/10/2026 | Incorporar as skills customizadas da EasyJur e a perspectiva de liderança do Vinicius | Reunião Boomit + EasyJur |
| 29/10/2026 | Desenvolver o Copiloto separado do app B2C da Leadrix, com o motor de IA isolado para ser compartilhado depois | Marcelo |
| 03/11/2026 | Tudo nasce nas contas da Leadrix e migra depois para as contas da Boomit | Marcelo |
| 03/11/2026 | Integração com a Boomit por API (`copiloto-export`); importação de arquivos fica só como contingência | Marcelo |
| 03/11/2026 | Seguir com o código sem esperar o acesso ao repositório Boomit, usando dados fictícios no formato do contrato, para decidir com um mock-up funcional | Marcelo |
| 03/11/2026 | Escopo segue para validação com a Manu | Marcelo |
