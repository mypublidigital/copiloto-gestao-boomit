# 04 · Roadmap da Fase 1 e prompts para o Claude Code

**Status:** v0.2 (03/11/2026).
**Como usar:** cada sprint tem objetivo, entregas, critério de aceite, dependências e um prompt pronto. Cole o prompt no Claude Code dentro do repositório indicado. Todos trabalham em Plan Mode e param para aprovação: o conteúdo é aprovado antes de o código ser escrito.

**Situação em 03/11/2026:**
- Integração por API decidida.
- Acesso ao repositório Boomit pendente.
- Tudo nas contas da Leadrix.

Por isso a Sprint 0 constrói uma fatia vertical funcional com dados fictícios, e a descoberta no repositório Boomit (0A) roda quando o acesso sair.

| Sprint | Entrega principal | Depende de |
|---|---|---|
| **0** | Fundação + fatia vertical com dados fictícios: login, equipe, ficha, preparar feedback, simular, combinados, painel do diretor | Nada (só contas Leadrix) |
| 0A | Descoberta no repositório Boomit e ajustes no contrato e no modelo | Acesso ao repositório Boomit |
| 1 | Conector por API (`FonteApi`), normalizador completo, importação de hierarquia | 0A e `copiloto-export` na Boomit |
| 2 | Completar Minha equipe, ficha e registro (filtros, talentos de IA, edição) | 0 |
| 3 | Demais tipos de preparação: PDI, conversa difícil, decisão na alçada, 1:1 | 0; alçadas da EasyJur |
| 4 | Fontes e reuniões (upload com aviso, extração, planejado × combinado) | 3; formato das transcrições |
| 5 | Skills (Mentor Vini, Coach de coach) e lente | Arquivos das skills |
| 6 | Lembretes e painel completo da gestão superior | 4 |
| 7 | Avaliação de qualidade, custos, LGPD, migração e piloto | Pendências 6, 10–13 do doc 01 |

---

## Como começar (modo autoplay)

1. Descompacte o pacote no repositório do GitHub e faça o push.
2. Abra o Claude Code na pasta do repositório e digite `/autoplay`.
3. O Claude Code confere o ambiente, cria o `.env.local` vazio e pede só o que bloqueia a etapa atual (lista em `docs/necessidades.md`). Você preenche as variáveis no `.env.local`, joga arquivos em `_entrada/` ou responde no chat, e diz "pronto".
4. A qualquer momento, `/status` mostra onde está e o que depende de você.

O Prompt 0 abaixo continua valendo como especificação da Sprint 0; o `/autoplay` o executa. No modo contínuo, os checkpoints seguem sem parar (com commit e resumo a cada um); no modo `/autoplay passo-a-passo`, cada checkpoint espera sua aprovação.

---

## Sprint 0 · Fundação e fatia vertical com dados fictícios

**Objetivo:** mock-up funcional com a arquitetura definitiva (não é protótipo descartável), para tomar decisões de produto e mostrar à Boomit e à EasyJur.

**Entregas:** quatro checkpoints, cada um aprovado antes do seguinte.

**Aceite final:** o roteiro de demonstração abaixo roda do começo ao fim; testes de RLS e de isolamento do motor passam.

**Roteiro de demonstração**

1. Entrar como **Marina Costa** (líder): "Minha equipe" mostra 8 pessoas da Exemplo Tech (fictícia).
2. Abrir **Ana Faria**: resumo Boomit (maiores gaps, parecer Focus, PDI Boomit, nível de IA) e linha do tempo com a natureza de cada item.
3. **Preparar feedback** com o relato "duas entregas fora do prazo combinado na última quinzena". O plano cita as fontes do fixture e separa fatos confirmados, fatos a confirmar, hipóteses, perguntas e combinados propostos.
4. **Simular** na intensidade desafiadora e receber o debrief com os cinco critérios.
5. Confirmar dois combinados com prazo e registrar a aplicação da conversa (data e relato).
6. Testar um relato com indício de assédio: abre a tela de encaminhamento, sem plano de conversa.
7. Entrar como **Ricardo Alves** (diretor): o painel mostra o andamento da Marina, sem conteúdo de ensaio.
8. Entrar como **Admin RH**: vê todos os colaboradores e o status do conector; não vê preparações nem simulações.
9. Entrar como **Paulo Mendes** (outro líder): não vê a equipe da Marina.

**Prompt 0 — fundação e fatia vertical (rodar em `copiloto-gestao-boomit/`):**

```text
Leia CLAUDE.md e os documentos docs/01 a docs/04 antes de qualquer coisa.

Contexto desta sprint:
- O repositório da Plataforma Boomit ainda NÃO está acessível. Use a stack hipotética
  do CLAUDE.md e os dados fictícios de fixtures/boomit/ (contrato v1). Nenhum dado real.
- Tudo nasce nas contas da Leadrix. Siga as regras de "Ambiente e migração" do CLAUDE.md:
  tudo como código, segredos só em variável de ambiente, nada configurado à mão sem
  registro em docs/runbook-migracao.md.
- Objetivo: um mock-up FUNCIONAL com a arquitetura definitiva, para decisões de produto.
  Não é protótipo descartável.

Sprint 0 — trabalhe em 4 checkpoints. No modo passo a passo: em cada um, entre em Plan
Mode, apresente o plano, aguarde minha aprovação, execute, mostre o resultado contra o
aceite e PARE. No modo autoplay: siga as regras de .claude/commands/autoplay.md.

CHECKPOINT 1 — Fundação
1. Scaffold React + Vite + TypeScript strict + Tailwind + shadcn/ui. Tokens de cor e
   tipografia Boomit do CLAUDE.md. Navegação: Visão geral · Desempenho · Desenvolvimento ·
   Comportamento · Organização · Crises · Liderança · Fontes e evidências.
   Faixa fixa "Ambiente de demonstração · dados fictícios" quando VITE_MODO_DEMO=true.
2. Supabase: sem Docker por enquanto. Vincule o projeto remoto de desenvolvimento da
   Leadrix com "npx supabase" (via scripts/com-env.sh), aplique
   supabase/migrations/0001_fundacao.sql, converta supabase/tests/rls_cenario_piloto.sql
   para pgTAP mantendo TODOS os casos e proponha a forma mais simples de rodá-los sem
   Docker. Gere os tipos.
3. Estrutura de pastas com supabase/functions/_shared/motor/ e
   supabase/functions/_shared/adaptadores/boomit/. Regra de isolamento do motor:
   no-restricted-imports no ESLint + teste "motor-isolado" (falha se o motor importar
   adaptadores ou mencionar "boomit").
4. .env.example completo (Supabase, ANTHROPIC_API_KEY, MODELO_PRINCIPAL, MODELO_RAPIDO,
   MODELO_AVALIACAO, BOOMIT_FONTE=mock, VITE_MODO_DEMO) e docs/runbook-migracao.md iniciado.
Aceite: app sobe local; testes de RLS e de isolamento passam.

CHECKPOINT 2 — Dados fictícios, equipe e ficha
1. Interface FonteBoomit em _shared/adaptadores/boomit/ com:
   - FonteMock: lê fixtures/boomit/empresa-exemplo.v1.json e valida contra
     contracts/boomit-export.v1.schema.json;
   - FonteApi: stub que retorna "não implementado" (entra na Sprint 1).
   Seleção por BOOMIT_FONTE.
2. Edge Function conector-boomit (service role): abre conector_execucao, grava
   boomit_snapshot com hash (idempotente), roda o normalizador e grava contexto_empresa,
   contexto_colaborador, contexto_colaborador_sensivel e colaborador.
   Normalizador como módulo puro com testes para R1 (competências + seed de
   competencia_sinonimo a partir de docs/referencia-boomit-plataforma-contexto.md §4.3),
   R5 (números e datas) e R9 (seções indisponíveis). R2–R4, R6–R8, R10, R11 como testes
   pendentes marcados para a Sprint 1.
3. Seed de demonstração: empresa, hierarquia de fixtures/boomit/hierarquia-exemplo.csv,
   usuários Marina Costa (líder), Ricardo Alves (líder, diretor), Paulo Mendes (líder),
   Admin RH (admin_empresa) e Mentor Boomit (mentor da Marina), todos fictícios.
   Login por link mágico. Com VITE_MODO_DEMO=true, um seletor de persona troca de
   usuário em um clique; esse seletor não pode existir no build de produção.
4. Telas M1 Minha equipe e M2 Ficha do colaborador (docs/01 §5): resumo do contexto
   Boomit (3–5 maiores gaps meta × atual, parecer Focus, PDI Boomit, nível de IA,
   alinhamento, personalidade com o aviso "referência, não rótulo") e linha do tempo
   pela view linha_do_tempo + eventos Boomit, com a natureza de cada item rotulada.
Aceite: itens 1, 2, 8 e 9 do roteiro de demonstração do docs/04.

CHECKPOINT 3 — Preparar feedback e simular (motor)
1. No motor: tipos e schema de saída (docs/03 §4), interface ItemDeContexto, montagem do
   pacote em camadas (docs/03 §3), guardrails (docs/03 §8), verificação determinística
   (docs/03 §2, etapa 5), prompts versionados com VERSAO. Zero referência à Boomit.
2. No adaptador Boomit: tradução de contexto_empresa, contexto_colaborador (e do sensível,
   quando a RLS liberar), registros e combinados em ItemDeContexto com fonte_id e rótulo.
3. Edge Function preparar-situacao, executada com o JWT do líder: classificação
   (MODELO_RAPIDO) → pacote de contexto → geração (MODELO_PRINCIPAL) via tool use com o
   JSON Schema → verificação → grava preparacao (versão n) e interacao_ia (só metadados).
   Nesta sprint, só o tipo "feedback"; os outros tipos aparecem desabilitados ("em breve").
4. Tela M3: tipo → pessoa → relato → contexto selecionado (fontes desmarcáveis) → plano
   editável com referências clicáveis → salvar versão. Relato sensível abre a tela de
   encaminhamento (docs/03 §8, modo encaminhamento).
5. Simulação M4: Edge Function com streaming, três intensidades, debrief estruturado com
   os cinco critérios (docs/03 §5).
6. Testes do motor com o modelo simulado (stub), sem chamar a API.
Aceite: itens 3, 4 e 6 do roteiro; fato sem fonte cai em "a confirmar".

CHECKPOINT 4 — Combinados, aplicação e visão do diretor
1. Combinados propostos salvos como pendente_revisao → confirmação → lista M7 com prazo e
   status (lembretes ficam para a Sprint 6).
2. Registrar a aplicação da conversa (aplicada_em + relato_aplicacao) e registro rápido M5.
3. Painel M8 usando andamento_lideranca(empresa_id).
4. Deploy de demonstração do front na hospedagem da Leadrix, apontando para o projeto
   Supabase de desenvolvimento, com o conector rodado em modo mock.
Aceite: roteiro de demonstração completo (itens 1 a 9).

Ao final de cada checkpoint, liste: o que foi feito × aceite, o que ficou pendente e as
decisões de produto que surgiram e precisam de mim.
```

---

## Sprint 0A · Descoberta no repositório Boomit (quando o acesso sair)

**Objetivo:** confirmar o que a Boomit realmente tem e ajustar contrato, migration e stack.
**Entregas:** `docs/boomit-schema-real.md` e propostas de ajuste.
**Aceite:** o mapeamento cobre todos os campos do contrato v1; diferenças em relação ao que foi construído na Sprint 0 estão listadas com o impacto de cada uma.

```text
Leia CLAUDE.md e docs/01 a docs/04. O repositório da Plataforma Boomit está em ../boomit
e deve ser tratado como SOMENTE LEITURA.

Sprint 0A — descoberta técnica. Entre em Plan Mode.
1. Leia ../boomit sem alterar nada: stack, estrutura, autenticação, migrations do Supabase,
   Edge Functions e as tabelas que correspondem a empresa, colaborador, assessment,
   sessão Focus, personalidade, Projeto Performance (PDI), maturidade de IA e
   indicadores (PPL, R3, matriz, alinhamento, potencial).
2. Crie docs/boomit-schema-real.md: para cada campo de contracts/boomit-export.v1.schema.json
   → tabela.coluna real, ou "calculado em tela" (com o arquivo), ou "não existe".
   Confirme ou descarte cada item marcado como (inferido) em
   docs/referencia-boomit-plataforma-contexto.md e cada regra R1–R11 (docs/02 §3.3).
3. Compare a stack da Boomit com a usada na Sprint 0 e liste o que precisa convergir.
4. Proponha, sem aplicar: ajustes no contrato v1, nos fixtures, na migration (como
   migration nova) e no normalizador.
Pare e aguarde minha aprovação.
```

---

## Sprint 1 · Conector por API

**Objetivo:** dados Boomit reais chegando pelo contrato (quando houver contrato de dados) ou dados de homologação da Boomit.
**Entregas:** Edge Function `copiloto-export` no repositório Boomit · `FonteApi` no Copiloto · normalizador R1–R11 completo · importação de hierarquia por planilha · tela Admin › Conector · sincronização diária.
**Aceite:** sincronização idempotente; cada regra R1–R11 com teste; seção indisponível não derruba a sincronização; salário, gênero e celular nunca persistidos; troca mock → API só por `BOOMIT_FONTE`.

**Prompt 1A — no repositório Boomit (para o desenvolvimento Boomit):**

```text
Repositório: Plataforma Boomit. Leia ../copiloto-gestao-boomit/contracts/ e
../copiloto-gestao-boomit/docs/boomit-schema-real.md.

Tarefa: criar a Edge Function copiloto-export, SOMENTE LEITURA. Entre em Plan Mode.
- Autenticação por token por empresa: tabela nova copiloto_token (empresa_id, hash do
  token, criado_em, revogado_em). Nunca guardar o token em texto puro.
- GET com empresa_id, desde (ISO 8601), cursor e limite.
- Resposta conforme boomit-export.v1.schema.json. NÃO incluir salário, gênero, celular
  nem o contexto financeiro da empresa.
- Uma seção que falhar ao gerar vai para secoes_indisponiveis; a resposta não falha inteira.
- Teste que valida o payload de uma empresa de teste contra o JSON Schema.
- Opcional, em PR separado: eventos assinados (HMAC) para assessment.concluido,
  focus.concluido, pdi.gerado, devolutiva.concluida, colaborador.alterado.
Não altere telas nem tabelas existentes além da tabela de tokens. Aguarde aprovação.
```

**Prompt 1B — no Copiloto:**

```text
Sprint 1 — conector por API. Leia docs/02 §3 e contracts/. Entre em Plan Mode.

1. Implementar FonteApi: chamada à Edge Function copiloto-export da Boomit com token por
   empresa (segredo em variável de ambiente), paginação por cursor, parâmetro "desde".
2. Completar o normalizador com R2–R4, R6–R8, R10 e R11 (testes da Sprint 0 que estavam
   pendentes passam a valer).
3. Endpoint boomit-evento (opcional): recebe evento assinado (HMAC) e relê o colaborador.
4. Importação de hierarquia: planilha (e-mail do liderado, e-mail do líder) →
   vinculo_lideranca, com relatório de linhas rejeitadas.
5. Tela Admin › Conector: última execução, status, registros lidos, alertas,
   botão "sincronizar agora".
6. pg_cron: sincronização diária às 03:00 America/Sao_Paulo.
7. Contingência (só se aprovada): importação de Excel/PDF para o mesmo contrato, com revisão.
Aguarde aprovação antes de codar.
```

---

## Sprint 2 · Completar Minha equipe, ficha e registro

**Objetivo:** fechar M1, M2 e M5 sobre o que a Sprint 0 entregou.
**Aceite:** filtros por área, nível e maturidade de IA; registro com edição auditada; estados vazios e de erro tratados.

```text
Sprint 2 — completar M1, M2 e M5 (docs/01 §5). Entre em Plan Mode.
- M1: filtros (área, nível, maturidade de IA N1–N5 para descoberta de talentos), ordenação
  por próxima ação, estados vazios.
- M2: filtro da linha do tempo por natureza e origem; histórico de versões do contexto
  Boomit (data da última sincronização); aviso quando houver alertas de qualidade.
- M5: edição de registro com auditoria; mudança de visibilidade privada ↔ linha de gestão.
Toda leitura pelo cliente com o JWT do usuário. Aguarde aprovação.
```

---

## Sprint 3 · Demais tipos de preparação

**Objetivo:** completar o núcleo de valor.
**Entregas:** PDI (respeitando `modo_pdi`), conversa difícil/conflito, decisão na alçada, preparação de 1:1.
**Aceite:** saídas válidas nas extensões do doc 03 §4; decisão fora da alçada sinalizada; versões preservadas.

```text
Sprint 3 — demais tipos de preparação. Leia docs/03 §4 e §8. Entre em Plan Mode.
1. Extensões do schema por tipo: pdi, conversa_dificil, decisao_alcada, preparacao_reuniao.
2. PDI conforme empresa.config.modo_pdi (boomit | integrado | nativo), gravando
   acao_desenvolvimento quando couber.
3. Decisão na alçada: ler alcada do nível/cargo do líder; sinalizar "fora da alçada" e
   quem consultar.
4. Habilitar os tipos na tela M3; manter o motor sem referência à Boomit.
5. Ampliar os testes do motor (stub do modelo) para os novos tipos.
Aguarde aprovação.
```

---

## Sprint 4 · Fontes e reuniões

**Objetivo:** mentorias e reuniões entram no contexto e viram combinados revisados.
**Entregas:** M6 completo (doc 02 §4 e doc 03 §6).
**Aceite:** upload de reunião sem aviso é recusado; anotações do Gemini e transcrição completa processadas; cada extração aponta o trecho; nada vira combinado sem o líder; comparação planejado × combinado quando há preparação.

```text
Sprint 4 — Fontes e reuniões. Leia docs/02 §4 e docs/03 §6. Entre em Plan Mode.

1. Upload para bucket privado {empresa_id}/{documento_id}/ e registro em documento_fonte,
   com confirmação obrigatória de que os participantes foram avisados.
2. Fila de processamento assíncrono: extração de texto (.docx, .pdf, .vtt, .txt, .md),
   detecção de formato (anotações do Gemini × transcrição completa), divisão em trechos,
   sugestão de pessoas vinculadas.
3. Extração com MODELO_RAPIDO de combinados, decisões e temas → extracao pendente,
   com trecho_id e confiança. Prazos relativos convertidos a partir de data_evento.
4. Tela de revisão: confirmar, editar ou descartar; confirmados viram combinado aberto.
5. Comparação planejado × combinado com a última preparação da mesma situação.
6. Trechos entram na camada 7 do pacote de contexto (busca textual + recência + pessoa).
Use como caso de teste um arquivo no formato das anotações do Gemini (com dados fictícios).
Aguarde aprovação.
```

---

## Sprint 5 · Skills e lente

**Objetivo:** trazer o método que a EasyJur já usa para dentro dos fluxos.
**Entregas:** módulo de skills (cadastro, versões, sandbox, aprovação, ativação) · lente aplicada às preparações e simulações · importação do Mentor Vini e do Coach de coach.
**Aceite:** skill ativa altera tom e método, mas não remove fontes nem encaminhamento (teste automatizado); cada ativação registrada na auditoria.

```text
Sprint 5 — Skills e lente. Leia docs/03 §7. Entre em Plan Mode.

1. Skills: CRUD no admin, versões imutáveis, campo modo (lente / assistente / revisor),
   gatilhos por tipo de situação, materiais de conhecimento, sandbox para testar com
   situações de referência, aprovação nomeada e ativação. A lógica de aplicação fica
   no motor; cadastro e telas ficam no produto.
2. Orquestrador: aplicar a lente ativa em toda preparação e simulação; mostrar o botão
   do assistente nas etapas dos gatilhos; respeitar a precedência do docs/03 §7.
3. Teste: com uma skill de teste que pede "não cite fontes", a saída continua com
   fontes e a verificação determinística passa.
4. Importação: vou fornecer os arquivos do Mentor Vini e do Coach de coach. Proponha a
   conversão (método × conhecimento) e me mostre antes de gravar.
Aguarde aprovação.
```

---

## Sprint 6 · Lembretes e painel completo da gestão superior

**Objetivo:** atuação ativa e acompanhamento unificado, sobre a base da Sprint 0.
**Entregas:** ações completas de combinados · lembretes por pg_cron (in-app e e-mail) · painel com drill-down.
**Aceite:** lembrete antes do prazo e no vencimento sem ação manual; renegociação preserva histórico; painel mostra só contagens e prazos (teste de RLS).

```text
Sprint 6 — Lembretes e painel completo. Entre em Plan Mode.

1. M7: ações cumprido / renegociar (novo prazo, histórico preservado) / não cumprido /
   cancelar; evidência registrada.
2. Lembretes: ao abrir um combinado com prazo, criar lembretes (D-2 e D0, configurável);
   job pg_cron a cada 15 min envia os vencidos (in-app + e-mail por provedor
   transacional configurável); central de notificações no app.
3. M8: drill-down só até o líder; nenhuma leitura de situacao/preparacao/simulacao.
4. Testes de RLS adicionais para o painel e para os lembretes.
Aguarde aprovação.
```

---

## Sprint 7 · Qualidade, custos, migração e piloto

**Objetivo:** chegar ao piloto com evidência de qualidade, custo conhecido e regras de dados fechadas.
**Entregas:** `npm run eval` (doc 03 §10) · painel de uso e custo · checklist LGPD · carga real da EasyJur · material de onboarding dos líderes · métricas do piloto (doc 01 §7).
**Aceite:** conjunto de avaliação passando nas checagens determinísticas; custo por líder ativo estimado; pendências 6 e 10 a 13 do doc 01 resolvidas; migração para as contas da Boomit ensaiada.

```text
Sprint 7 — Qualidade e piloto. Leia docs/01 §7 e docs/03 §10. Entre em Plan Mode.

1. Conjunto de avaliação em evals/: casos de referência, sensíveis e de alçada (formato
   JSON), runner com checagens determinísticas e modelo-juiz (MODELO_AVALIACAO),
   relatório comparando a versão atual do prompt com a anterior.
2. Painel admin de uso: líderes ativos por semana, preparações, aplicações, combinados
   no prazo, custo por líder.
3. Checklist LGPD em docs/lgpd-checklist.md: finalidade, minimização, retenção por empresa,
   exclusão, logs, fornecedores.
4. Rotina de retenção: job que aplica empresa.config.retencao_dias.
5. Roteiro de onboarding de 15 minutos para líderes (três portas: Preparar, Registrar,
   Subir reunião).
6. Revisar docs/runbook-migracao.md e ensaiar a migração para as contas da Boomit em um
   ambiente de teste.
Aguarde aprovação.
```
