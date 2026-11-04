# CLAUDE.md — Copiloto de Gestão Boomit

## O que é este projeto

Aplicação web que apoia líderes nas rotinas de gestão de pessoas: preparar e simular conversas (feedback, PDI, conflitos), decidir dentro da própria alçada, registrar tratativas e acompanhar combinados. O contexto vem da **Plataforma Boomit** (assessments, Focus, PDI Boomit, maturidade em IA), das **mentorias Boomit** e das **reuniões e evidências** que o próprio líder envia.

O Copiloto prolonga a mentoria entre as sessões. Ele prepara, organiza e lembra; **o líder confirma os fatos e decide**.

- Cliente-piloto da Fase 1: **EasyJur** (driver: reunião Boomit + EasyJur de 22/10/2026).
- A Plataforma Boomit é um sistema separado, também construído com Claude Code. Este repositório **consome** dados dela por **API** (decidido em 03/11/2026); não altera o repositório Boomit sem pedido explícito.
- **Ambiente:** tudo nasce nas contas da **Leadrix** (GitHub, Supabase, Anthropic, hospedagem) e migra depois para as contas da Boomit. Ver "Ambiente e migração".
- **Fase atual:** o acesso ao repositório Boomit está pendente. Desenvolvemos com **dados fictícios** no formato do contrato (`fixtures/boomit/`) para ter um mock-up funcional com a arquitetura definitiva. Sem Docker por enquanto: o banco é o projeto Supabase **remoto** de desenvolvimento (só dados fictícios), operado por `npx supabase`.

## Leia antes de qualquer tarefa

| Arquivo | Quando ler |
|---|---|
| `docs/01-escopo-fase1-easyjur.md` | Sempre que a tarefa tocar funcionalidade, tela ou permissão |
| `docs/02-arquitetura-e-integracao-boomit.md` | Banco, conector, ingestão, segurança |
| `docs/03-ia-contexto-skills-guardrails.md` | Qualquer chamada à IA, prompt, skill ou saída estruturada |
| `docs/04-roadmap-e-prompts.md` | Sequência de sprints, checkpoints e critérios de aceite |
| `docs/progresso.md` | **Sempre, primeiro:** estado atual, perguntas abertas, decisões provisórias |
| `docs/necessidades.md` | O que é preciso em cada etapa e o que fazer enquanto não chega |
| `_entrada/` | Material que o Marcelo deixou para você (regras em `_entrada/README.md`) |
| `docs/referencia-boomit-plataforma-contexto.md` | Dicionário (inferido) dos dados Boomit e problemas de qualidade |
| `contracts/boomit-export.v1.schema.json` | Contrato de dados Boomit → Copiloto |
| `fixtures/boomit/` | Dados fictícios no contrato v1 (empresa, 13 colaboradores, hierarquia) para o modo mock |
| `supabase/migrations/` | Modelo de dados vigente |

## Stack

A regra é **espelhar a stack da Boomit** para que a mesma equipe mantenha os dois sistemas. Enquanto o repositório Boomit não estiver acessível, vale a hipótese abaixo; a Sprint 0A confirma ou ajusta.

Hipótese de partida: React + Vite + TypeScript (strict) + Tailwind + shadcn/ui · Supabase (Postgres, Auth, Storage, Edge Functions em Deno, pg_cron) · Anthropic API chamada **somente** em Edge Functions · zod para validar toda entrada e toda saída de IA.

## Regras invioláveis de produto

1. **O Copiloto não decide sobre pessoas.** Não recomenda desligar, promover, punir, nem julga denúncias. Organiza fatos, alternativas, mensagens e próximos passos.
2. **Fato tem fonte.** Toda afirmação factual exibida ao líder carrega `fonte_ids`. Sem fonte, vai para "fatos a confirmar".
3. **Assessment é referência, não rótulo.** Personalidade (16P), PPL, quadrante da matriz e ação R3 nunca são apresentados como causa de comportamento nem usados para recomendar decisão sobre a pessoa. Nunca gerar frases como "por ser ENFJ, ela vai…".
4. **Ensaio privado ≠ registro corporativo.** Situações, preparações e simulações são do líder (admin da empresa não lê). Só viram registro corporativo o que o líder publica: `registro` com visibilidade `linha_gestao` e `combinado` confirmado.
5. **Nada se consolida sem revisão do líder.** Combinados extraídos de reuniões entram como `pendente_revisao`.
6. **Situações sensíveis entram em modo encaminhamento** (assédio, discriminação, violência, risco à saúde ou integridade, ilegalidade, denúncia envolvendo liderança): acolher, indicar o canal configurado pela empresa, ajudar só a preparar o encaminhamento. Ver `docs/03` §8.
7. **Skills da empresa não removem guardrails.** Precedência: guardrails da plataforma > políticas e alçadas da empresa > lente de liderança > skill da etapa > pedido do líder.
8. **"Treinado com o acervo" = contexto recuperado em tempo de uso.** Nenhum modelo é treinado ou ajustado com dados de clientes.
9. **Nenhuma inferência individual** sobre estado emocional, engajamento ou intenção de saída de uma pessoa.
10. **Reunião só vira fonte com aviso aos participantes.** O upload exige a confirmação (`participantes_avisados`), e o banco recusa sem ela.
11. **A natureza de cada registro é explícita:** ensaio (simulação), relato do líder, aplicação (conversa real com data), combinado, fonte, dado Boomit. Ensaio e relato nunca aparecem como aplicação comprovada (view `linha_do_tempo`).
12. **Fronteira com o sistema interno da EasyJur** (avaliação de desempenho, metas, PDI formal): o Copiloto não cria ciclo avaliativo, nota, calibração nem cadastro oficial de metas. PDI segue `empresa.config.modo_pdi`. Ver `docs/01` §3.

## Motor compartilhado — isolamento obrigatório

O núcleo de IA será extraído depois para um pacote compartilhado com outro produto da Leadrix. Por isso:

- `supabase/functions/_shared/motor/` contém só lógica genérica: tipos e schema de saída, montagem do pacote de contexto em camadas, guardrails, verificação determinística, simulação e debrief, combinados, lente e skills, conjunto de avaliação.
- O motor recebe contexto apenas pela interface `ItemDeContexto` (`fonte_id`, `rotulo`, `camada`, `conteudo`, `data`) e **não conhece** campos, tabelas ou nomes da Boomit.
- Tudo que é Boomit fica em `supabase/functions/_shared/adaptadores/boomit/` (conector, normalizador, tradução de `contexto_*` em itens).
- `motor/**` não importa nada de `adaptadores/**` nem do app: regra `no-restricted-imports` no ESLint e teste `motor-isolado` que falha se aparecer "boomit" no código do motor.

## Ambiente e migração futura para a Boomit

- Tudo como código: migrations, seeds, `supabase/config.toml`, Edge Functions, buckets e políticas de storage criados por migration, provedores de login em configuração.
- Segredos só em variável de ambiente; `.env.example` sempre completo. Nenhuma URL, chave ou ID de projeto fixo no código.
- Nada configurado à mão no painel sem registro em `docs/runbook-migracao.md`.
- **Nenhum dado real da EasyJur na conta Leadrix** até existir contrato de tratamento de dados. Até lá, só `fixtures/`.

## Regras de dados

- Multi-tenant por `empresa_id`. **RLS habilitada em todas as tabelas**; toda migration nova inclui políticas e um caso em `supabase/tests/`.
- Edge Functions que montam contexto para a IA usam o **JWT do usuário** (a RLS filtra o que entra no prompt). `service_role` só no conector Boomit, no processamento de documentos e em jobs.
- Dados Boomit: snapshot bruto imutável (`boomit_snapshot`) → normalizador → `contexto_*`. A UI nunca lê o payload bruto.
- O conector usa a interface `FonteBoomit` com duas implementações: `FonteMock` (lê `fixtures/boomit/` e valida contra o contrato) e `FonteApi` (Edge Function `copiloto-export` da Boomit). A troca é por variável de ambiente (`BOOMIT_FONTE=mock|api`), sem mudar o resto do código.
- Números vêm de campos estruturados, nunca de textos gerados por IA da Boomit (são regeneráveis e podem divergir).
- Minimização: não importar salário, gênero, celular nem financeiro da empresa na Fase 1.
- Logs de IA (`interacao_ia`) guardam metadados (modelo, tokens, custo, fontes usadas), não o conteúdo.
- Storage: buckets privados, caminho `{empresa_id}/{documento_id}/arquivo`, URLs assinadas de curta duração.

## Convenções

- Domínio, tabelas e colunas em **português, snake_case, sem acento** (consistente com a Boomit). UI em PT-BR.
- Tipos do banco gerados pelo Supabase CLI; nada de `any`.
- Prompts versionados em `supabase/functions/_shared/prompts/` (um arquivo por finalidade, com `VERSAO` exportada e registrada em `interacao_ia`).
- Modelos de IA em configuração (env), nunca fixos no código: `MODELO_PRINCIPAL`, `MODELO_RAPIDO`, `MODELO_AVALIACAO`.
- Saída de IA sempre estruturada (tool use com JSON Schema) e validada com zod antes de gravar.
- Datas em ISO 8601 no banco; exibição `dd/mm/aaaa`, fuso America/Sao_Paulo.

## Identidade visual (Boomit)

| Token | Cor |
|---|---|
| `--boomit-preto` | `#1B1B1C` |
| `--boomit-verde` | `#545E54` |
| `--boomit-claro` | `#F2F2F2` |
| `--boomit-cinza-azulado` | `#C6CFD1` |
| `--boomit-neutro-quente` | `#EDE9E4` |
| `--boomit-taupe` | `#9D9482` |

Tipografia: PP Mori (Regular e SemiBold) — arquivos de fonte licenciados vêm da Boomit; fallback `Inter, system-ui, sans-serif`. Referência de telas: "Minha equipe" e "Preparar feedback" da apresentação de 20/10/2026.

## Como trabalhar neste repositório

**Modo padrão: autoplay** (comando `/autoplay`, em `.claude/commands/autoplay.md`). Você conduz a sequência do `docs/04`, lê `_entrada/`, pede de uma vez só o que bloqueia a etapa atual, adianta o resto e mantém `docs/progresso.md` atualizado. Decisões técnicas você toma e registra; decisões de produto reversíveis entram como **provisórias** em `progresso.md`; o resto você pergunta. As condições de parada estão no comando.

**Modo passo a passo** (`/autoplay passo-a-passo` ou pedido explícito): Plan Mode, plano, aprovação, execução, uma etapa por vez.

Em qualquer modo:

1. Segredos: nunca leia `.env.local` nem exiba valores. Comandos que precisam deles rodam via `bash scripts/com-env.sh '<comando com $VARIAVEL>'`. `bash scripts/verificar-ambiente.sh` diz o que está preenchido sem mostrar valores.
2. Uma migration por mudança de modelo; nunca editar migration já aplicada.
3. Ao fechar um checkpoint: testes (incluindo RLS e isolamento do motor), commit, `git push origin main`, `progresso.md` atualizado.
4. Regra de negócio não coberta pelos docs e que não pode ser provisória → perguntar; não inventar.
5. Dados de exemplo e seeds sempre fictícios. Em modo demonstração (`VITE_MODO_DEMO=true`), a interface mostra a faixa "dados fictícios" e um seletor de persona; nada disso existe no build de produção.

## Definição de pronto

Critério de aceite da sprint atendido · RLS testada para os perfis envolvidos · sem segredo no código · tipos gerados atualizados · docs atualizados quando a decisão mudar.
