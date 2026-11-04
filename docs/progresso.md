# Progresso — diário do autoplay

Mantido pelo Claude Code a cada `/autoplay`. Serve para retomar o trabalho entre sessões e
para o Marcelo revisar de forma assíncrona. Resumo rápido: `/status`.

## Estado atual

- **Etapa:** Sprint 0 · Checkpoint 2 (Dados fictícios, equipe e ficha) — **aceite atendido**
- **Situação:** itens 1, 2, 8 e 9 do roteiro de demonstração verificados no navegador.
  Pendente só o **deploy da Edge Function `conector-boomit`**, que o CLI do Supabase exige
  confirmar com o Marcelo (pergunta 1). Os dados já foram carregados pelo seed, que roda o
  mesmo código da função. Próximo: Checkpoint 3 (preparar feedback e simular).
- **Última atualização:** 04/11/2026

## Perguntas abertas (dependem do Marcelo)

| # | Pergunta | Onde responder | Bloqueia | Desde |
|---|---|---|---|---|
| 1 | Autorizar o deploy da Edge Function `conector-boomit` no projeto `copiloto-gestao-boomit-dev`? O CLI pede confirmação explícita (`--yes`) | Chat | Conector rodando no Supabase (o seed já carregou os dados pelo mesmo código) | 04/11/2026 |

## Decisões provisórias (para revisar)

| Data | Decisão | Por que esta opção | Como reverter |
|---|---|---|---|
| 04/11/2026 | **Login (N8):** usuários reais entram por link mágico (`shouldCreateUser: false`, só quem já existe). No modo demonstração, as 5 personas fictícias entram por senha (`VITE_DEMO_SENHA`, gerada e só no `.env.local`) e há um seletor de persona no topo. | Link mágico não funciona com e-mails fictícios; a senha só existe em builds de demonstração. | Apagar `src/demo/` e o alias em `vite.config.ts`; o login por link continua. |
| 04/11/2026 | **Minha equipe** mostra os liderados **diretos**. Para o diretor (Ricardo), isso são os dois líderes; a visão da linha inteira fica para o painel M8 (Checkpoint 4). | Mantém a home do líder curta e igual para todos os níveis. | Trocar a consulta por `pode_ver_colaborador` (linha inteira) em `MinhaEquipe.tsx`. |
| 04/11/2026 | **Maiores gaps** juntam Digital de Crescimento (meta × atual) e Táticas (esperado × atual), até 5, maiores primeiro. | O roteiro pede "3–5 maiores gaps meta × atual" sem dizer de qual bloco. | Filtrar `origem` em `gaps_prioritarios` no normalizador. |
| 04/11/2026 | Home do **Mentor Boomit** = líder mentorado e equipe dele (o que a RLS já libera). | Perfil "Mentor" no docs/01 §4. | — |

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
| 04/11/2026 | Sprint 0 · CP2 | Conector mock + normalizador (R1, R5, R9; 8 regras da Sprint 1 como pendentes), migrations 0002 e 0003, seed com 13 colaboradores e 5 personas, telas M1 e M2, painel do admin. Testes: 32 unitários, 39 de RLS local e remoto, build de produção limpo. Roteiro 1, 2, 8 e 9 verificados no navegador. Deploy da Edge Function aguardando confirmação | ver `git log` |
