# Necessidades — o que o Claude Code precisa, etapa por etapa

O `/autoplay` compara este checklist com o `.env.local` (via `scripts/verificar-ambiente.sh`)
e com a pasta `_entrada/`, e pede só o que bloqueia a etapa atual. A coluna "Enquanto não
chega" diz o que fazer para não parar.

## Sprint 0 · Fundação e fatia vertical (dados fictícios)

| # | Item | Onde colocar | Como conseguir | Bloqueia | Enquanto não chega |
|---|---|---|---|---|---|
| N1 | Node 20+ e git | Máquina | nodejs.org (LTS) · git-scm.com | Tudo | — |
| N2 | Repositório no GitHub com `origin` configurado | `git remote` | Já criado na organização Leadrix | Commits e push | Commits só locais |
| N3 | Projeto Supabase de desenvolvimento: `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` | `.env.local` | supabase.com › New project (organização Leadrix, região São Paulo; a senha do banco é definida na criação) › Project Settings › API e General | Checkpoint 1 (banco) | Adiantar o scaffold do front |
| N4 | `SUPABASE_ACCESS_TOKEN` (CLI sem login interativo) | `.env.local` | supabase.com › Account › Access Tokens › Generate | Checkpoint 1 (`link`, `db push`) | Você roda `npx supabase login` no terminal |
| N5 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `.env.local` | Mesmos valores de N3 | Checkpoint 1 (front conectado) | — |
| N6 | `ANTHROPIC_API_KEY` | `.env.local` | console.anthropic.com › API Keys (chave exclusiva deste projeto, com limite de gasto) | Checkpoint 3 (chamadas reais) | Motor testado com stub do modelo |
| N7 | Hospedagem do front (Vercel da Leadrix): `VERCEL_TOKEN` ou login seu via `npx vercel login` | `.env.local` ou terminal | vercel.com › Account Settings › Tokens | Checkpoint 4 (deploy de demonstração) | Demonstração local |
| N8 | Login no modo demonstração | Decisão | — | Checkpoint 2 | **Decisão provisória sugerida:** usuários de demonstração fictícios entram por senha só com `VITE_MODO_DEMO=true`; link por e-mail para usuários reais |

## Sprint 0A · Descoberta no repositório Boomit

| # | Item | Onde colocar | Como conseguir | Bloqueia | Enquanto não chega |
|---|---|---|---|---|---|
| N9 | Acesso ao repositório Boomit, clonado em `../boomit` | Máquina | Manu / desenvolvimento Boomit | Sprint 0A | Seguir com fixtures (Sprint 0, 2, 3) |

## Sprint 1 · Conector por API

| # | Item | Onde colocar | Como conseguir | Bloqueia | Enquanto não chega |
|---|---|---|---|---|---|
| N10 | `BOOMIT_API_URL`, `BOOMIT_API_TOKEN` (`copiloto-export` implementado) | `.env.local` | Desenvolvimento Boomit (Prompt 1A do `docs/04`) | Sprint 1 | `BOOMIT_FONTE=mock` |
| N11 | `BOOMIT_WEBHOOK_SECRET` (opcional) | `.env.local` | Desenvolvimento Boomit | Eventos | Sincronização diária |

## Sprints 3 a 6

| # | Item | Onde colocar | Quem | Bloqueia | Enquanto não chega |
|---|---|---|---|---|---|
| N12 | Alçadas dos gestores (o que decidem sozinhos) | `_entrada/` | Vinicius / RH EasyJur | Sprint 3 (decisão na alçada) | Alçadas fictícias plausíveis, marcadas como exemplo |
| N13 | Formato das transcrições ou anotações usado pela EasyJur (exemplo anonimizado) | `_entrada/` | TI EasyJur | Sprint 4 | Formato das anotações do Gemini com conteúdo fictício |
| N14 | Arquivos das skills Mentor Vini e Coach de coach (instruções e materiais) | `_entrada/` | Vinicius | Sprint 5 | Skill de teste fictícia para validar o mecanismo |
| N15 | Provedor de e-mail transacional: `EMAIL_API_KEY`, `EMAIL_REMETENTE` | `.env.local` | Leadrix | Sprint 6 (e-mail) | Lembretes só no app |

## Antes de qualquer dado real (Sprint 7)

| # | Item | Quem | Bloqueia |
|---|---|---|---|
| N16 | Contrato de tratamento de dados (Leadrix, Boomit, EasyJur) enquanto o produto estiver nas contas da Leadrix | Jurídicos | Qualquer dado real |
| N17 | Hierarquia real e lista de líderes do piloto | RH EasyJur / Vinicius | Carga real (só depois de N16) |
| N18 | Canais de encaminhamento (RH, jurídico, canal de ética) | RH EasyJur | Modo encaminhamento com canais reais |
| N19 | Login: SSO Google Workspace ou link por e-mail | TI EasyJur | Produção (provisório: link por e-mail) |
| N20 | Visibilidade de PPL, quadrante e R3 para líderes | Luana | Configuração final (provisório: desligado) |
| N21 | Fronteira com o sistema interno (PDI) | Luana | `modo_pdi` final (provisório: `boomit`) |
