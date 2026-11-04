# Copiloto de Gestão Boomit — pacote de desenvolvimento da Fase 1

Base para construir o Copiloto no Claude Code, com a EasyJur como cliente-piloto e a Plataforma Boomit como fonte de dados.

**Status:** v0.3 (03/11/2026), com modo autoplay. Escopo em validação com a Boomit; desenvolvimento começando nas contas da Leadrix, com dados fictícios, enquanto o acesso ao repositório Boomit não sai. A migration e os testes de RLS rodam em Postgres local.

| Arquivo | Conteúdo |
|---|---|
| `CLAUDE.md` | Contexto permanente que o Claude Code lê em toda sessão: regras invioláveis, dados, convenções, identidade visual |
| `docs/01-escopo-fase1-easyjur.md` | O que a reunião de 22/10 definiu, como muda o produto, fronteira com o projeto interno da EasyJur, perfis, módulos, métricas e pendências |
| `docs/02-arquitetura-e-integracao-boomit.md` | Decisões de arquitetura, modos de integração com a Boomit, minimização, normalizador R1–R11, ingestão de reuniões, LGPD |
| `docs/03-ia-contexto-skills-guardrails.md` | Pipeline de IA, pacote de contexto, saída estruturada, simulação, extração de combinados, skills (Mentor Vini, Coach de coach), guardrails, modelos, avaliação |
| `docs/04-roadmap-e-prompts.md` | Sprints 0–7 com critérios de aceite e prompts prontos para o Claude Code |
| `docs/referencia-boomit-plataforma-contexto.md` | Levantamento da Plataforma Boomit (cópia do contexto do projeto) |
| `contracts/boomit-export.v1.schema.json` | Contrato Boomit → Copiloto (para alinhar com o desenvolvimento Boomit) |
| `contracts/exemplo-payload.v1.json` | Exemplo fictício validado contra o contrato |
| `supabase/migrations/0001_fundacao.sql` | Modelo de dados, RLS e auditoria |
| `supabase/tests/database/rls_cenario_piloto.test.sql` | 28 testes de permissão e regras de dados por perfil (líder, diretor, outro líder, RH, mentor) |
| `fixtures/boomit/empresa-exemplo.v1.json` | Empresa fictícia com 13 colaboradores no contrato v1 (validado), para o modo mock |
| `fixtures/boomit/hierarquia-exemplo.csv` | Hierarquia fictícia: diretor → 2 líderes → equipes |

## Começar (modo autoplay)

1. Coloque este pacote no repositório do GitHub e faça o push.
2. Abra o Claude Code na pasta e digite `/autoplay`. Ele confere o ambiente e pede só o que faltar.
3. Jogue material em `_entrada/` (ver `_entrada/README.md`); chaves vão no `.env.local`.
4. `/status` mostra onde está e o que depende de você. Diário completo em `docs/progresso.md`.

| Arquivo do modo autoplay | Função |
|---|---|
| `.claude/commands/autoplay.md` | O comando que conduz tudo |
| `.claude/commands/status.md` | Resumo do estado e do que depende de você |
| `.claude/settings.json` | Comandos liberados sem confirmação e bloqueios de segurança |
| `docs/necessidades.md` | O que é preciso em cada etapa |
| `docs/progresso.md` | Diário mantido pelo Claude Code |
| `scripts/verificar-ambiente.sh` | Confere ferramentas e variáveis sem mostrar valores |
| `scripts/com-env.sh` | Roda comandos com as chaves do `.env.local` sem expô-las |

## Comandos do dia a dia

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Sobe o front em http://localhost:5173 |
| `npm run verificar` | Tipos, lint, testes do motor e RLS local (tudo o que roda sem Supabase) |
| `npm run test:rls` | Migration + 28 testes de RLS (pgTAP) num Postgres embutido (PGlite), sem Docker |
| `npm run test:rls:remoto` | Os mesmos testes no projeto Supabase de desenvolvimento, sem deixar dados |
| `npm run db:aplicar` | Aplica no projeto remoto as migrations pendentes (por HTTPS; `-- --listar` só mostra) |
| `npm run db:tipos` | Gera `src/tipos/banco.ts` a partir do banco remoto |
| `npm run seed:demo` | Carrega a empresa fictícia (conector mock), a hierarquia e as 5 personas de demonstração. Pode rodar de novo |
| `npm run verificar:producao` | Gera o build de produção e confere que nada do modo demonstração foi junto |
| `npm run db:segredos` | Grava no Supabase os segredos de IA das Edge Functions, lendo do `.env.local` (não exibe valores) |
| `npm run ensaio:ia` | Roda o motor com o modelo real como a persona Marina, sem gravar nada (custa centavos) |
