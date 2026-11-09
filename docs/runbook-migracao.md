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
| Supabase (desenvolvimento) | `copiloto-gestao-boomit-dev` (ref `tdghjpunfqlhpugrsbtr`), organização mypublicompany, `sa-east-1` | a definir |
| Anthropic | chave exclusiva do projeto, com limite de gasto — **pendente** | a definir |
| Hospedagem do front | Vercel, time `marcelos-projects`, projeto `copiloto-gestao-boomit-demo` (aberto com o link desde 09/11/2026; `npm run publicar:demo` sem `--publico` volta a exigir login) | a definir |
| E-mail transacional | Resend previsto (N15 aberta); sem chave, e-mails ficam na caixa de saída do app | a definir |

## 3. Passos manuais registrados

| Data | Ambiente | Passo | Por que não é código | Como refazer no destino |
|---|---|---|---|---|
| 04/11/2026 | GitHub | Repositório criado e `origin` configurado | Criação de conta/repositório | Criar repositório, `git remote set-url origin <nova url>`, `git push` |
| 04/11/2026 | Supabase | Projeto de desenvolvimento criado no painel; chaves, senha do banco e access token copiados para o `.env.local` | Criação de projeto e emissão de chaves | Criar o projeto no destino e preencher um `.env.local` novo |
| 04/11/2026 | Supabase | `npx supabase link` e migration `0001` aplicada com `npm run db:aplicar` (Management API) | A rede local bloqueia as portas 5432/6543; `db push` não conecta | `npm run db:aplicar` (ou `npx supabase db push` numa rede que libere a porta) — o histórico é o mesmo |

| 04/11/2026 | Supabase | Migrations 0002 e 0003 aplicadas; `npm run seed:demo` (empresa fictícia, hierarquia, 5 personas com senha de demonstração) | Seed usa a Admin API de Auth para criar usuários | `npm run seed:demo` no projeto novo (só dados fictícios) |
| 04/11/2026 | Supabase | Deploy de `conector-boomit` (`npx supabase functions deploy conector-boomit --use-api --yes`, autorizado pelo Marcelo). Sem `BOOMIT_FONTE` definida, a função usa `mock` | Publicação de função é ação no projeto hospedado | Mesmo comando no projeto novo; `npx supabase secrets set BOOMIT_FONTE=api` quando a API da Boomit existir |

| 04/11/2026 | Supabase | Migration 0004; deploy de `preparar-situacao` e `simular`; segredos `ANTHROPIC_API_KEY`, `MODELO_PRINCIPAL`, `MODELO_RAPIDO`, `MODELO_AVALIACAO` gravados com `npm run db:segredos` (rodado pelo Marcelo) | Segredos não vão para o repositório | `npm run db:aplicar`, `npx supabase functions deploy preparar-situacao simular --use-api` e `npm run db:segredos` no projeto novo |

| 04/11/2026 | Vercel | Projeto `copiloto-gestao-boomit-demo` no time `marcelos-projects`, criado por `npm run publicar:demo`, com Deployment Protection (Vercel Authentication) em **"all"** | Configuração de projeto da Vercel | Rodar `npm run publicar:demo` com o token da conta de destino (o script cria o projeto e liga a proteção) |
| 04/11/2026 | Supabase | Senha das personas de demonstração trocada (`VITE_DEMO_SENHA` nova + `npm run seed:demo`) após exposição do site | Segredo fora do repositório | Gerar uma senha nova no destino |

| 04/11/2026 | Supabase | Migrations 0005 (bucket `fontes`) e 0006 (lembretes, pg_cron `copiloto-lembretes` a cada 15 min); deploy de `processar-documento`; alçadas fictícias no seed | Agendamento e bucket são criados pela migration | `npm run db:aplicar` no projeto novo cria o bucket e o agendamento (pg_cron precisa estar disponível) |
| 08/11/2026 | Supabase | Migration 0007 (agenda, decisões, régua, insights; pg_cron `copiloto-envios` e `copiloto-insights` via pg_net), deploy de `apoiar-decisao`, `processar-envios` e `insights-semanais` (as duas últimas sem verificação de JWT: conferem o segredo do agendador), `npm run db:agendador` grava `url_funcoes` e `url_app` em `config_sistema` (feito em 08/11/2026) | URLs do projeto não ficam no código | `npm run db:aplicar`, deploy das funções, `npm run db:agendador` e `npm run db:segredos` (com EMAIL_*) no projeto novo |

**Rede sem porta do Postgres:** `db push`, `db pull` e `test db` do CLI precisam da porta 5432/6543.
Onde ela estiver bloqueada, use `npm run db:aplicar`, `npm run test:rls:remoto` e `npm run db:tipos`,
que vão pela Management API (HTTPS) com o `SUPABASE_ACCESS_TOKEN`. As migrations ficam registradas
em `supabase_migrations.schema_migrations`, a mesma tabela do CLI.

## 4. Roteiro de migração (rascunho — ensaiar na Sprint 7)

1. Criar o projeto Supabase na organização da Boomit (região São Paulo).
2. Preencher um `.env.local` novo com os valores do projeto da Boomit.
3. `npx supabase link --project-ref "$SUPABASE_PROJECT_REF"` e `npx supabase db push` (ou `npm run db:aplicar`).
4. `npx supabase config push` para aplicar `supabase/config.toml` (auth, URLs).
5. Publicar as Edge Functions (`npx supabase functions deploy`) e cadastrar os segredos (`npx supabase secrets set`).
6. Rodar `npm run test:rls:remoto` no projeto novo.
7. Repetir os passos manuais da seção 3 que se aplicarem.
8. Trocar a hospedagem do front e as variáveis `VITE_*`.
9. Dados: só depois do contrato de tratamento de dados (N16). Até lá, nenhum dado real em nenhuma das contas.
