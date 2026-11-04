# Runbook de ambiente e migração (Leadrix → Boomit)

Tudo nasce nas contas da Leadrix e migra depois para as contas da Boomit (CLAUDE.md,
"Ambiente e migração"). Este arquivo registra **tudo o que não está em código**: cada passo
feito à mão num painel entra aqui, com data. Se não está aqui nem no repositório, não existe.

## 1. O que já é código (não precisa de passo manual)

| Item | Onde |
|---|---|
| Modelo de dados, RLS, auditoria | `supabase/migrations/` |
| Testes de RLS (pgTAP) | `supabase/tests/database/` · `npm run test:rls` (local) · `npm run test:rls:remoto` |
| Configuração do projeto Supabase (auth, URLs de redirecionamento, storage, edge runtime) | `supabase/config.toml` |
| Edge Functions e motor de IA | `supabase/functions/` |
| Front (React + Vite) | raiz do repositório (`src/`, `vite.config.ts`) |
| Variáveis necessárias | `.env.example` (sempre completo; valores só no `.env.local`, fora do Git) |
| Versão do Supabase CLI | `devDependencies` do `package.json` (`npx supabase`) |

## 2. Contas e recursos por ambiente

| Recurso | Leadrix (agora) | Boomit (destino) |
|---|---|---|
| GitHub | `mypublidigital/copiloto-gestao-boomit` | a definir |
| Supabase (desenvolvimento) | projeto de desenvolvimento, organização Leadrix, região São Paulo — **pendente** | a definir |
| Anthropic | chave exclusiva do projeto, com limite de gasto — **pendente** | a definir |
| Hospedagem do front | Vercel da Leadrix — **pendente** | a definir |
| E-mail transacional | a definir (Sprint 6) | a definir |

## 3. Passos manuais registrados

| Data | Ambiente | Passo | Por que não é código | Como refazer no destino |
|---|---|---|---|---|
| 04/11/2026 | GitHub | Repositório criado e `origin` configurado | Criação de conta/repositório | Criar repositório, `git remote set-url origin <nova url>`, `git push` |

## 4. Roteiro de migração (rascunho — ensaiar na Sprint 7)

1. Criar o projeto Supabase na organização da Boomit (região São Paulo).
2. Preencher um `.env.local` novo com os valores do projeto da Boomit.
3. `npx supabase link --project-ref "$SUPABASE_PROJECT_REF"` e `npx supabase db push`.
4. `npx supabase config push` para aplicar `supabase/config.toml` (auth, URLs).
5. Publicar as Edge Functions (`npx supabase functions deploy`) e cadastrar os segredos (`npx supabase secrets set`).
6. Rodar `npm run test:rls:remoto` no projeto novo.
7. Repetir os passos manuais da seção 3 que se aplicarem.
8. Trocar a hospedagem do front e as variáveis `VITE_*`.
9. Dados: só depois do contrato de tratamento de dados (N16). Até lá, nenhum dado real em nenhuma das contas.
