# Progresso — diário do autoplay

Mantido pelo Claude Code a cada `/autoplay`. Serve para retomar o trabalho entre sessões e
para o Marcelo revisar de forma assíncrona. Resumo rápido: `/status`.

## Estado atual

- **Etapa:** Sprint 0 · Checkpoint 1 (Fundação)
- **Situação:** em andamento. Feito o que não depende do Supabase: front, estrutura do motor
  isolado, ESLint e teste de isolamento, RLS em pgTAP rodando localmente sem Docker (28/28),
  `supabase/config.toml` e runbook. **Falta:** vincular o projeto Supabase remoto, aplicar a
  migration (`db push`), rodar o RLS no remoto e gerar os tipos. Bloqueado por N3, N4 e N5.
- **Última atualização:** 04/11/2026

## Perguntas abertas (dependem do Marcelo)

| # | Pergunta | Onde responder | Bloqueia | Desde |
|---|---|---|---|---|
| 1 | Criar o projeto Supabase de desenvolvimento (N3) e preencher `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` | `.env.local` | Checkpoint 1 (banco) | 04/11/2026 |
| 2 | Gerar `SUPABASE_ACCESS_TOKEN` (N4) | `.env.local` | Checkpoint 1 (`link`, `db push`) | 04/11/2026 |
| 3 | Copiar URL e anon key para `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (N5) | `.env.local` | Checkpoint 1 (front conectado) | 04/11/2026 |
| 4 | (Opcional) `SUPABASE_DB_URL` do Session pooler, para rodar o RLS no banco remoto | `.env.local` | Teste de RLS remoto | 04/11/2026 |

## Decisões provisórias (para revisar)

| Data | Decisão | Por que esta opção | Como reverter |
|---|---|---|---|

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

## Insumos recebidos

| Data | Arquivo | Atende | Uso |
|---|---|---|---|
| 04/11/2026 | — | — | `_entrada/` vazia na primeira execução |

## Execução

| Data | Etapa | Resultado | Commit |
|---|---|---|---|
| 04/11/2026 | Repositório | Git iniciado e primeiro push | `b1a6da8` |
| 04/11/2026 | Sprint 0 · CP1 (parte sem Supabase) | Front sobe local com a faixa de demonstração; typecheck, lint, 5 testes do motor e 28/28 de RLS (local) passam | ver `git log` |
