# Progresso — diário do autoplay

Mantido pelo Claude Code a cada `/autoplay`. Serve para retomar o trabalho entre sessões e
para o Marcelo revisar de forma assíncrona. Resumo rápido: `/status`.

## Estado atual

- **Etapa:** **Sprints 0, 2, 3, 4 e 6 concluídas** (04/11/2026), código no GitHub, migrations e
  Edge Functions no Supabase de desenvolvimento.
- **Inclusões de 08/11/2026 no Supabase de desenvolvimento:** apoio à decisão, agenda da liderança (dia/semana/mês com busca), régua de comunicação por e-mail e insights semanais. Migration 0007 aplicada, 89 testes de RLS no remoto, funções publicadas, agendamentos ativos, agenda fictícia da Marina no seed; conferido no navegador (local). Site de demonstração republicado em 08/11/2026, com login exigido em todos os endereços. E-mails ficam na caixa de saída até existir provedor (N15).
- **Situação:** site de demonstração republicado com as sprints novas (04/11/2026), com login exigido em
  todos os endereços.
  Próximas: Sprint 0A e 1 (acesso ao repositório e API Boomit, N9 e N10), Sprint 5 (arquivos das
  skills, N14) e Sprint 7 (qualidade, LGPD, migração).
- **Última atualização:** 08/11/2026

## Perguntas abertas (dependem do Marcelo)

| # | Pergunta | Onde responder | Bloqueia | Desde |
|---|---|---|---|---|
| 2 | Alçadas reais dos gestores (N12) — hoje há duas alçadas fictícias | `_entrada/` | Decisão na alçada com regras da EasyJur | 04/11/2026 |
| 3 | Provedor de e-mail transacional (N15). Código pronto para Resend: `EMAIL_API_KEY`, `EMAIL_REMETENTE` (e, para testar com as personas, `EMAIL_DESTINO_TESTE`) e `npm run db:segredos`. Até lá os e-mails ficam na caixa de saída do app | `.env.local` | Envio real dos e-mails | 04/11/2026 |

## Incidentes

| Data | O que aconteceu | Impacto | Correção |
|---|---|---|---|
| 04/11/2026 | Na primeira publicação, a Vercel tratou o deploy como produção e o endereço principal (`copiloto-gestao-boomit-demo.vercel.app`) ficou **aberto sem login por cerca de 10 minutos**; numa segunda tentativa, por menos de 1 minuto (o script detectou e apagou). A proteção padrão do projeto só cobre pré-visualizações. | Quem acessasse veria o site de demonstração (dados fictícios) e a senha das personas no código, podendo usar a IA com a chave da Leadrix. Nenhum dado real. | Publicações apagadas; proteção do projeto em "all" (todos os endereços); script testa todos os endereços sem login e apaga a publicação se algum abrir; **senha das personas trocada** (a antiga não vale mais). |

| 04/11/2026 | Na republicação, o CLI da Vercel falhou e a mensagem de erro repetiu o comando com o `VERCEL_TOKEN` na saída do terminal local. | O token ficou no log desta sessão do Claude Code; não foi para o GitHub nem para a Vercel. | Script passou a publicar pela API sem passar o token na linha de comando; token revogado e substituído pelo Marcelo em 05/11/2026 (novo token conferido: acesso ao projeto e proteção "all"). |

## Decisões provisórias (para revisar)

| Data | Decisão | Por que esta opção | Como reverter |
|---|---|---|---|
| 04/11/2026 | **Login (N8):** usuários reais entram por link mágico (`shouldCreateUser: false`, só quem já existe). No modo demonstração, as 5 personas fictícias entram por senha (`VITE_DEMO_SENHA`, gerada e só no `.env.local`) e há um seletor de persona no topo. | Link mágico não funciona com e-mails fictícios; a senha só existe em builds de demonstração. | Apagar `src/demo/` e o alias em `vite.config.ts`; o login por link continua. |
| 04/11/2026 | **Minha equipe** mostra os liderados **diretos**. Para o diretor (Ricardo), isso são os dois líderes; a visão da linha inteira fica para o painel M8 (Checkpoint 4). | Mantém a home do líder curta e igual para todos os níveis. | Trocar a consulta por `pode_ver_colaborador` (linha inteira) em `MinhaEquipe.tsx`. |
| 04/11/2026 | **Maiores gaps** juntam Digital de Crescimento (meta × atual) e Táticas (esperado × atual), até 5, maiores primeiro. | O roteiro pede "3–5 maiores gaps meta × atual" sem dizer de qual bloco. | Filtrar `origem` em `gaps_prioritarios` no normalizador. |
| 04/11/2026 | Home do **Mentor Boomit** = líder mentorado e equipe dele (o que a RLS já libera). | Perfil "Mentor" no docs/01 §4. | — |
| 04/11/2026 | **Alçadas fictícias** (Sprint 3): tático decide escala, folgas e trocas de até 2 dias, sem custos acima de R$ 1.000; estratégico, contratações no orçamento e despesas até R$ 20.000. Marcadas "(exemplo fictício)". | N12 ainda não chegou; a decisão na alçada precisa de política para citar. | Apagar as linhas de `alcada` da empresa de demonstração e cadastrar as reais. |
| 04/11/2026 | **"Dentro da alçada" exige citar uma política de alçada**; sem citação válida, a verificação marca "incerto". | Evita afirmar limite sem fonte (regra 2). | Remover o caso `decisao_alcada` em `verificarExtensao`. |
| 04/11/2026 | **PDI** grava ações de desenvolvimento ao registrar a conversa, com origem conforme `modo_pdi` (padrão `boomit` → `boomit_pdi`). | N21 (Luana) pendente; `boomit` é o padrão do docs/01 §3. | Trocar `empresa.config.modo_pdi`. |
| 04/11/2026 | **Planejado × combinado** por semelhança de palavras (radical de 5 letras): ≥ 0,55 "como planejado", ≥ 0,25 "alterado", abaixo "não tratado"; extras "novo na reunião". A tela avisa que é aproximação. | Barato, sem chamada de IA, e o líder confere. | Trocar por comparação com o modelo rápido em `src/dominio/comparacao.ts`. |
| 04/11/2026 | **Lembretes** D-2 e D0 às 9h de São Paulo para quem criou o combinado (desde 08/11 também por e-mail e com aviso de vencido; ver abaixo). | Necessidades: "lembretes só no app" enquanto N15 não chega. | `empresa.config.lembretes_dias`. |
| 04/11/2026 | **Drill-down do painel** mostra pessoa, prazo e status dos combinados do líder; nunca a descrição. | Aceite da Sprint 6: "só contagens e prazos". | Função `andamento_combinados_lider`. |

| 08/11/2026 | **Apoio à decisão** vale para qualquer decisão de gestão. O modelo propõe critérios (peso 1–5), 2–4 alternativas com notas por critério, riscos, reversibilidade, alçada, quem consultar e próximos passos; a **pontuação ponderada é calculada no código**, o líder ajusta os pesos na tela e ela é rotulada "apoio, não recomendação". Alternativa com termo proibido (desligar, promover…) é removida. | Regra 1: o Copiloto não decide; pesos do líder deixam a escolha com ele. | `motor/decisao.ts` e `dominio/decisoes.ts`. |
| 08/11/2026 | **Agenda** junta compromissos (tabela nova), prazos de combinados, conversas aplicadas, reuniões enviadas e prazos/registros de decisões. Privada do líder (diretor e RH não veem). Busca cobre 12 meses para trás e para frente. | "Agenda da liderança" sem detalhe de quem mais vê; segue a regra dos ensaios (privado). | Política `compromisso_ler` na 0007. |
| 08/11/2026 | **Régua de comunicação:** compromisso → confirmação (e-mail), véspera (app + e-mail), 1 h antes (app), 2 h depois "registre como foi" (app + e-mail); combinado → D-2, D0 e vencido D+1 às 9h (app + e-mail); decisão → véspera do prazo e dia da revisão. Remarcar, concluir ou cancelar refaz os pendentes. | Pedido de 08/11: lembretes conforme os agendamentos. | `empresa.config.lembretes_dias` e funções `*_gerar_lembretes` (nova migration). |
| 08/11/2026 | **E-mails não levam conteúdo privado**: só título, data, pessoa e o link. **Personas de demonstração nunca recebem** (usuário com `demo` no cadastro); com `EMAIL_DESTINO_TESTE`, a cópia vai para esse endereço com "[teste]" no assunto. | Domínio fictício pode existir de verdade; e-mail sai da plataforma. | `_shared/email/provedor.ts`. |
| 08/11/2026 | **Insights semanais** às segundas, 7h de São Paulo: 5 agentes por regras (combinados, agenda sem registro, cadência de 1:1 de 30 dias, decisões, revisões de reunião) levantam sinais; o modelo principal redige o resumo e de 2 a 5 recomendações citando os sinais; recomendação sem sinal sai, sinal de prioridade alta esquecido entra. Sem modelo, as regras montam o resumo. | "Recomendação ativa dos agentes a partir da leitura dos acontecimentos". Agentes por regra evitam inferência sobre pessoas (regra 9). | `_shared/agentes/semana.ts` e `motor/insights.ts`. |

## Decisões técnicas

| Data | Decisão |
|---|---|
| 04/11/2026 | Front na raiz do repositório (`src/`, `vite.config.ts`); Edge Functions em `supabase/functions/`. Um único `package.json`. |
| 04/11/2026 | TypeScript fixado em 6.0 (`typescript-eslint` ainda não aceita o 7). Vite 8, React 19, Tailwind 4, shadcn/ui (new-york), React Router. |
| 04/11/2026 | ESLint no lugar do oxlint do modelo do Vite, por causa da regra `no-restricted-imports` do motor. |
| 04/11/2026 | Isolamento do motor: `no-restricted-imports` em `supabase/functions/_shared/motor/**` + `tests/motor-isolado.test.ts` (vitest), que também testa o próprio detector. |
| 04/11/2026 | RLS sem Docker: testes em pgTAP (`supabase/tests/database/`, transação desfeita no final). Local: PGlite + pgTAP mínimo (`scripts/rls-local/`), `npm run test:rls`. Remoto: pgTAP real, `npm run test:rls:remoto`. O mesmo arquivo também roda com `npx supabase test db` quando houver Docker. |
| 04/11/2026 | Supabase CLI como `devDependency` (versão fixa) em vez de `npx` solto. |
| 04/11/2026 | `supabase/config.toml` criado pelo CLI; `site_url` e redirecionamentos apontam para o Vite (`localhost:5173`). |
| 04/11/2026 | `.gitattributes` com `eol=lf` para os scripts `.sh` não quebrarem fora do Windows. |
| 04/11/2026 | A rede local bloqueia as portas 5432/6543 (testado também contra um host público). Migrations, RLS remoto e tipos vão pela Management API (HTTPS): `npm run db:aplicar`, `npm run test:rls:remoto`, `npm run db:tipos`. O histórico de migrations usa a tabela do CLI, então `supabase db push` continua compatível. |
| 04/11/2026 | RLS remoto: o teste roda numa transação que termina com erro proposital trazendo os resultados TAP, o que garante rollback total. Verificado: 28/28, falha proposital detectada, banco sem resíduo. |
| 04/11/2026 | Tipos em `src/tipos/banco.ts` (gerados) com cópia em `supabase/functions/_shared/tipos/banco.ts` (as funções não importam `src/`); cliente do navegador em `src/lib/supabase.ts` (só URL + anon key). |
| 04/11/2026 | Conector: `FonteBoomit` (`FonteMock` valida o fixture contra o contrato com Ajv; `FonteApi` é stub), normalizador puro e `sincronizar()` em `_shared/adaptadores/boomit/`. Snapshot deduplicado por SHA-256 de JSON com chaves ordenadas. Sincronização idempotente (verificado: 2ª execução sem snapshot nem vínculo novo). |
| 04/11/2026 | `BOOMIT_FONTE` sem valor = `mock`. Por isso não foi preciso gravar segredo no Supabase nesta etapa (a gravação de segredos pelo agente foi bloqueada pela checagem de segurança). |
| 04/11/2026 | Migration 0002: semente de `competencia_sinonimo`, gerada da lista em `sinonimos.ts` (teste confere que as duas batem). Migration 0003: valor `mock` em `fonte_snapshot`, para dado fictício não aparecer como vindo da API. |
| 04/11/2026 | Seed de demonstração em `scripts/seed-demo.ts` (Node com remoção de tipos), via service role: roda `sincronizar()` com a `FonteMock`, importa a hierarquia do CSV e cria as 5 personas com papéis e mentoria. Idempotente. |
| 04/11/2026 | Modo demonstração fora do build de produção: `vite.config.ts` troca `@/demo` por `src/demo/vazio.ts` quando `VITE_MODO_DEMO != true`. `npm run verificar:producao` gera esse build e confere a ausência de seletor, e-mails das personas, faixa e senha. (A primeira versão, com `lazy()` atrás de uma constante, vazava tudo isso — o verificador pegou.) |
| 04/11/2026 | Motor (CP3): saída estruturada por `output_config.format`, com JSON Schema gerado do zod e validada de novo com zod (forçar ferramenta dá erro 400 no Sonnet 5.5). SDK oficial `@anthropic-ai/sdk` 1.4.0. Cache de prompt no bloco estável (guardrails + lente/skills + instruções). Recusa: `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) em Sonnet/Opus; o Haiku não tem fallback. |
| 04/11/2026 | Fontes vão ao modelo com apelidos curtos (F1, F2…) e voltam a `fonte_id` na verificação, então o modelo não consegue inventar um id plausível. Indicadores sensíveis (PPL, quadrante, R3) nunca entram no contexto da IA. |
| 04/11/2026 | Sensibilidade em duas camadas: termos no código (rede de segurança, nem chama o modelo) + classificador (Haiku). O ensaio real mostrou um caso que só o classificador pegou ("comentários de cunho sexual"); o padrão foi ampliado e virou teste. |
| 04/11/2026 | Custo estimado por chamada com a tabela de preços em `motor/modelo.ts` (US$ por 1M tokens: Sonnet 5.5 2/10, Haiku 5.5 0,10/0,50, Opus 5.5 4/20). Ensaio real: preparação ≈ US$ 0,05 em 25 s; classificação ≈ US$ 0,0002. |
| 04/11/2026 | Migration 0004: `interacao_ia.versao_prompt`. Prompts em `_shared/prompts/` com `VERSAO`, também cobertos pelo teste de isolamento do motor. `npm run ensaio:ia` roda o motor com o modelo real, sem gravar no banco. |
| 04/11/2026 | Situação é criada com id gerado na função e insert **sem** RETURNING: a política de leitura de `situacao` (`pode_ver_situacao`) consulta a própria tabela e não enxerga a linha nova no mesmo comando, então o RETURNING era recusado. Achado no teste pelo navegador. |
| 04/11/2026 | Segredos das funções: `npm run db:segredos` (lê só as variáveis de IA do `.env.local`, funciona no PowerShell). A gravação de segredos pelo agente é bloqueada pela checagem de segurança; o Marcelo roda o comando. |
| 04/11/2026 | CP4 sem migration nem função nova: combinados, aplicação e registro gravam direto do front com o JWT do líder (RLS da 0001). Combinados entram como `pendente_revisao` ao registrar a conversa e só viram `aberto` quando o líder confirma (regra 5). Painel M8 pela função `andamento_lideranca`. |
| 04/11/2026 | Linha do tempo: a view converte datas puras para meia-noite UTC, o que em São Paulo voltava um dia. A UI trata meia-noite UTC exata como data pura (teste). |
| 04/11/2026 | Deploy da demonstração (`npm run publicar:demo`): build local com as `VITE_*` do `.env.local` e envio só de `dist/` para a Vercel (time `marcelos-projects`, projeto `copiloto-gestao-boomit-demo`), com rewrite para o index.html. Proteção Vercel Authentication em "all"; o script confere cada endereço sem login e apaga a publicação se algum abrir. |
| 04/11/2026 | Sprint 3: extensões por tipo com schema próprio (`schemaDoPlano(tipo)`) e prompts `preparacao-<tipo>@2`. Camada 1 (alçadas) passou a ser citável e nunca é cortada. |
| 04/11/2026 | Sprint 4: leitura de documentos em `_shared/documentos/` (fflate para .docx, unpdf para .pdf); extração no motor (`motor/extracao.ts`, prompt `extracao@1`); processamento em segundo plano com `EdgeRuntime.waitUntil` e service role; bucket `fontes` com políticas ligadas ao documento (0005). Inserções em tabelas cuja leitura consulta a própria tabela (documento_fonte, situacao) não usam RETURNING. |
| 04/11/2026 | Publicação da demonstração pela API da Vercel (envia `dist/` e cria a publicação), sem o CLI: funciona com token restrito a um time e não expõe o token em comandos. O time vem do próprio projeto quando o token não lista times. |
| 04/11/2026 | Sprint 6: histórico e lembretes por trigger (0006), envio por pg_cron a cada 15 min; a função de envio recusa chamadas com usuário logado. O teste de RLS pegou dois bugs antes de aplicar (lista vazia de dias e permissão de execução) e ambos foram corrigidos. |
| 04/11/2026 | UI valida o JSON do contexto com zod (`src/dominio/contexto.ts`); teste garante que a saída do normalizador para os 13 colaboradores do fixture passa nesse schema. |

## Insumos recebidos

| Data | Arquivo | Atende | Uso |
|---|---|---|---|
| 04/11/2026 | — | — | `_entrada/` vazia na primeira execução |
| 04/11/2026 | `.env.local` (Supabase) | N3, N4, N5 | Projeto vinculado, migration aplicada |

## Execução

| Data | Etapa | Resultado | Commit |
|---|---|---|---|
| 04/11/2026 | Repositório | Git iniciado e primeiro push | `b1a6da8` |
| 04/11/2026 | Sprint 0 · CP1 (parte sem Supabase) | Front sobe local com a faixa de demonstração; typecheck, lint, 5 testes do motor e 28/28 de RLS (local) passam | `dc0b8a7` |
| 04/11/2026 | Sprint 0 · CP1 concluído | Migration 0001 no remoto (27 tabelas, todas com RLS, 54 políticas); RLS 28/28 local e remoto; tipos gerados; front com cliente Supabase. Aceite: app sobe local, RLS e isolamento passam | `42e0b42` |
| 04/11/2026 | Sprint 0 · CP2 | Conector mock + normalizador (R1, R5, R9; 8 regras da Sprint 1 como pendentes), migrations 0002 e 0003, seed com 13 colaboradores e 5 personas, telas M1 e M2, painel do admin. Testes: 32 unitários, 39 de RLS local e remoto, build de produção limpo. Roteiro 1, 2, 8 e 9 verificados no navegador. Deploy autorizado pelo Marcelo e feito: service role e Admin RH sincronizam (200, sem snapshot novo), líder recebe 403, sem login 401 | `a969432`, `22f1cea` |
| 04/11/2026 | Sprint 2 | Filtros e ordenação por próxima ação em Minha equipe; linha do tempo filtrável; edição de registro auditada | `bbb2e19` |
| 04/11/2026 | Sprint 3 | PDI, conversa difícil, decisão na alçada e 1:1; ensaio real dos 4 tipos (todos com extensão válida; alçada citada) | `495d737` |
| 04/11/2026 | Sprint 4 | Upload com aviso, leitura de 5 formatos, extração com trecho, revisão, planejado × combinado, camada 7; ensaio real com anotações fictícias do Gemini (5 combinados com prazo) | `e7141d1` |
| 04/11/2026 | Sprint 6 | Ações e histórico dos combinados, lembretes D-2/D0 com pg_cron, central de notificações, drill-down do painel. Testes: 106 unitários, 74 de RLS local e remoto; telas conferidas no navegador | `302b376` |
| 04/11/2026 | Sprint 0 · CP4 | Combinados (pendente → confirmado), aplicação, registro rápido, M7, M8; roteiro 1 a 9 no navegador; demonstração publicada com proteção em todos os endereços (ver Incidentes); senha das personas trocada | `e6c6711` + ver `git log` |
| 04/11/2026 | Sprint 0 · CP3 | Motor, adaptador, prompts, `preparar-situacao` e `simular` publicadas, telas M3 e M4. No navegador: plano da Ana com fatos citando fontes (relato F23, PDI F14, assessment F9–F13), hipóteses incluindo o papel do líder, versão 2 salva; simulação desafiadora com streaming e debrief nos 5 critérios sem nota; relato de assédio → encaminhamento com os canais, sem chamar a IA. `interacao_ia` só com metadados; custo da demonstração ≈ US$ 0,07. Testes: 74 unitários, 44 de RLS local e remoto | `5b33531` + ver `git log` |
| 08/11/2026 | Inclusões (decisão, agenda, régua, insights) | Migration 0007 (compromisso, decisao, email_envio, insight_semanal, config_sistema; régua nos lembretes; pg_cron `copiloto-envios` e `copiloto-insights`), funções `apoiar-decisao`, `processar-envios` e `insights-semanais`, telas Agenda, Decisões e Lembretes e insights. Testes: 132 unitários, 89 de RLS (local). Ensaio real: análise de decisão ≈ US$ 0,05 (3 alternativas, alçada citada), insights ≈ US$ 0,02 (7 sinais, 5 recomendações). Não publicado: token do Supabase recusado | ver `git log` |
| 08/11/2026 | Inclusões publicadas no Supabase | Token do Supabase renovado (veio colado no `.env.example`; movido para o `.env.local` sem exibir, nada foi para o GitHub). 0007 aplicada; RLS 89/89 no remoto; `apoiar-decisao`, `processar-envios` e `insights-semanais` publicadas; pg_cron disparou `processar-envios` (200; 6 e-mails na caixa, aguardando provedor). No navegador: agenda (semana, busca, detalhe com a régua), análise real da decisão de plantão (alçada citada, 3 alternativas) e insights reais da semana (5 recomendações). Correção: apelidos de fonte "(F7)" saem do texto livre. Site não republicado: token da Vercel sem acesso | ver `git log` |
| 08/11/2026 | Site republicado | Token da Vercel renovado (também veio no `.env.example`; movido para o `.env.local` sem exibir, nada foi para o GitHub). Publicação com as inclusões; endereço principal e da publicação devolvem 302 (pedem login) | ver `git log` |
