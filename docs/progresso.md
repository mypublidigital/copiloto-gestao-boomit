# Progresso — diário do autoplay

Mantido pelo Claude Code a cada `/autoplay`. Serve para retomar o trabalho entre sessões e
para o Marcelo revisar de forma assíncrona. Resumo rápido: `/status`.

## Estado atual

- **Etapa:** Sprint 0 · Checkpoint 2 (Dados fictícios, equipe e ficha)
- **Situação:** Checkpoint 1 concluído em 04/11/2026. Próximo: FonteBoomit/FonteMock, Edge
  Function conector-boomit, normalizador (R1, R5, R9), seed de demonstração, telas M1 e M2.
- **Última atualização:** 04/11/2026

## Perguntas abertas (dependem do Marcelo)

| # | Pergunta | Onde responder | Bloqueia | Desde |
|---|---|---|---|---|
| — | Nenhuma no momento (N3, N4 e N5 recebidos em 04/11/2026) | — | — | — |

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
| 04/11/2026 | A rede local bloqueia as portas 5432/6543 (testado também contra um host público). Migrations, RLS remoto e tipos vão pela Management API (HTTPS): `npm run db:aplicar`, `npm run test:rls:remoto`, `npm run db:tipos`. O histórico de migrations usa a tabela do CLI, então `supabase db push` continua compatível. |
| 04/11/2026 | RLS remoto: o teste roda numa transação que termina com erro proposital trazendo os resultados TAP, o que garante rollback total. Verificado: 28/28, falha proposital detectada, banco sem resíduo. |
| 04/11/2026 | Tipos em `src/tipos/banco.ts` (gerados); cliente do navegador em `src/lib/supabase.ts` (só URL + anon key). |

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
| 04/11/2026 | Sprint 0 · CP1 concluído | Migration 0001 no remoto (27 tabelas, todas com RLS, 54 políticas); RLS 28/28 local e remoto; tipos gerados; front com cliente Supabase. Aceite: app sobe local, RLS e isolamento passam | ver `git log` |
