-- =====================================================================
-- Copiloto de Gestão Boomit — 0001 · Fundação
-- Status: v0.2 (03/11/2026). Ainda não aplicada em nenhum ambiente: pode ser
-- editada até a Sprint 0; depois disso, só migrations novas.
-- Ajustes finos virão da descoberta no repositório Boomit (Sprint 0A).
--
-- Princípios aplicados aqui:
--   1. Multi-tenant por empresa_id + RLS em TODAS as tabelas.
--   2. Ensaio privado (situacao/preparacao/simulacao) ≠ registro corporativo
--      (registro com visibilidade 'linha_gestao', combinado confirmado).
--   3. Dados Boomit entram como snapshot imutável + contexto normalizado (JSONB).
--   4. Auditoria append-only nos registros de gestão.
--   5. Escrita de dados Boomit só pelo conector (service role, ignora RLS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type papel_usuario        as enum ('lider','mentor','admin_empresa','admin_boomit');
create type nivel_hierarquico    as enum ('operacional','tatico','estrategico');
create type frente_gestao        as enum ('desempenho','desenvolvimento','comportamento','organizacao','crises','lideranca');
create type tipo_situacao        as enum ('feedback','pdi','conversa_dificil','decisao_alcada','preparacao_reuniao','outro');
create type status_situacao      as enum ('rascunho','preparada','simulada','aplicada','em_acompanhamento','encerrada','encaminhada');
create type tipo_registro        as enum ('feedback','reconhecimento','observacao','alinhamento','ocorrencia');
create type visibilidade_registro as enum ('privado','linha_gestao');
create type status_combinado     as enum ('pendente_revisao','aberto','cumprido','renegociado','nao_cumprido','cancelado');
create type origem_combinado     as enum ('preparacao','transcricao','manual');
create type tipo_documento       as enum ('transcricao_mentoria','transcricao_reuniao','anotacao_reuniao','documento','nota');
create type status_processamento as enum ('recebido','processando','processado','erro');
create type fonte_snapshot       as enum ('api','importacao_excel','importacao_pdf');
create type modo_skill           as enum ('lente','assistente','revisor');
create type status_revisao       as enum ('pendente','aprovado','descartado');

-- ---------------------------------------------------------------------
-- Tenancy, pessoas e hierarquia
-- ---------------------------------------------------------------------
create table empresa (
  id                 uuid primary key default gen_random_uuid(),
  boomit_empresa_id  uuid unique,
  nome               text not null,
  -- config: { modo_pdi: 'nativo'|'integrado'|'boomit',
  --           exibir_indicadores_sensiveis: bool,
  --           canais_encaminhamento: {rh, juridico, etica},
  --           retencao_dias: int }
  config             jsonb not null default '{"modo_pdi":"boomit","exibir_indicadores_sensiveis":false}'::jsonb,
  criado_em          timestamptz not null default now()
);

create table colaborador (
  id                     uuid primary key default gen_random_uuid(),
  empresa_id             uuid not null references empresa(id) on delete cascade,
  boomit_colaborador_id  uuid,
  email                  text not null,
  nome                   text not null,
  cargo                  text,
  area                   text,            -- valor bruto vindo da Boomit
  area_normalizada       text,
  nivel                  nivel_hierarquico,
  diretoria              text,
  ativo                  boolean not null default true,
  atualizado_em          timestamptz not null default now(),
  unique (empresa_id, boomit_colaborador_id)
);
create unique index colaborador_email_uk on colaborador (empresa_id, lower(email));

-- Usuário pode atuar em mais de uma empresa (ex.: mentor Boomit).
create table membro (
  user_id         uuid not null references auth.users(id) on delete cascade,
  empresa_id      uuid not null references empresa(id) on delete cascade,
  papel           papel_usuario not null,
  colaborador_id  uuid references colaborador(id),   -- preenchido quando o usuário é colaborador da empresa
  criado_em       timestamptz not null default now(),
  primary key (user_id, empresa_id, papel)
);

-- A Boomit não guarda quem lidera quem: o Copiloto é dono desta informação.
create table vinculo_lideranca (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresa(id) on delete cascade,
  lider_id     uuid not null references colaborador(id) on delete cascade,
  liderado_id  uuid not null references colaborador(id) on delete cascade,
  inicio       date not null default current_date,
  fim          date,
  check (lider_id <> liderado_id)
);
create unique index vinculo_um_lider_ativo on vinculo_lideranca (liderado_id) where fim is null;
create index vinculo_lider_idx on vinculo_lideranca (lider_id) where fim is null;

-- Mentor Boomit ↔ líder mentorado.
create table mentoria (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa(id) on delete cascade,
  mentor_user_id  uuid not null references auth.users(id) on delete cascade,
  lider_id        uuid not null references colaborador(id) on delete cascade,
  ativo           boolean not null default true,
  unique (mentor_user_id, lider_id)
);

-- ---------------------------------------------------------------------
-- Dados Boomit (conector)
-- ---------------------------------------------------------------------
create table conector_execucao (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresa(id) on delete cascade,
  fonte             fonte_snapshot not null,
  iniciado_em       timestamptz not null default now(),
  finalizado_em     timestamptz,
  status            text not null default 'em_andamento',  -- em_andamento | sucesso | parcial | erro
  registros_lidos   int default 0,
  alertas           jsonb not null default '[]'::jsonb,
  erro              text
);

-- Payload bruto, imutável, deduplicado por hash.
create table boomit_snapshot (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa(id) on delete cascade,
  execucao_id     uuid references conector_execucao(id),
  entidade        text not null check (entidade in ('empresa','colaborador')),
  entidade_id     uuid not null,                 -- id Boomit da entidade
  schema_version  text not null,
  fonte           fonte_snapshot not null,
  payload         jsonb not null,
  hash            text not null,
  capturado_em    timestamptz not null default now(),
  unique (empresa_id, entidade, entidade_id, hash)
);

-- Contexto normalizado mais recente (o que o Copiloto efetivamente usa).
create table contexto_empresa (
  empresa_id         uuid primary key references empresa(id) on delete cascade,
  snapshot_id        uuid references boomit_snapshot(id),
  dados              jsonb not null,
  alertas_qualidade  text[] not null default '{}',
  atualizado_em      timestamptz not null default now()
);

create table contexto_colaborador (
  colaborador_id     uuid primary key references colaborador(id) on delete cascade,
  empresa_id         uuid not null references empresa(id) on delete cascade,
  snapshot_id        uuid references boomit_snapshot(id),
  dados              jsonb not null,
  alertas_qualidade  text[] not null default '{}',
  atualizado_em      timestamptz not null default now()
);

-- Indicadores com maior risco de rotulagem (PPL individual, quadrante da matriz,
-- ação R3, performance técnica). Separados para que a regra de exibição seja
-- aplicada no banco: empresa.config.exibir_indicadores_sensiveis.
create table contexto_colaborador_sensivel (
  colaborador_id  uuid primary key references colaborador(id) on delete cascade,
  empresa_id      uuid not null references empresa(id) on delete cascade,
  snapshot_id     uuid references boomit_snapshot(id),
  dados           jsonb not null,
  atualizado_em   timestamptz not null default now()
);

-- De-para das competências não normalizadas da Boomit.
create table competencia_sinonimo (
  chave_normalizada     text primary key,     -- ex.: 'comunicacao eficaz'
  competencia_canonica  text not null,        -- ex.: 'Comunicação'
  categoria             text                  -- 'digital_crescimento' | 'taticas_estrategicas' | 'outras'
);

-- ---------------------------------------------------------------------
-- Configuração da empresa: alçadas e skills
-- ---------------------------------------------------------------------
create table alcada (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresa(id) on delete cascade,
  nivel               nivel_hierarquico,
  cargo_referencia    text,
  pode_decidir        text not null,   -- o que o gestor decide sozinho
  limites             text,
  consultar           text,            -- quem consultar acima do limite
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now()
);

create table skill (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid references empresa(id) on delete cascade,  -- null = skill da plataforma
  slug         text not null,
  nome         text not null,
  descricao    text not null,
  modo         modo_skill not null,
  instrucoes   text not null,          -- corpo compatível com SKILL.md
  gatilhos     tipo_situacao[] not null default '{}',
  versao       int not null default 1,
  ativa        boolean not null default false,
  origem       text not null default 'nativa',   -- nativa | importada
  autor        text,
  aprovada_por text,
  criado_em    timestamptz not null default now(),
  unique (empresa_id, slug, versao)
);
create unique index skill_uma_ativa on skill (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), slug) where ativa;

create table skill_conhecimento (
  id            uuid primary key default gen_random_uuid(),
  skill_id      uuid not null references skill(id) on delete cascade,
  titulo        text not null,
  conteudo      text,
  storage_path  text,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Núcleo de gestão: situações, preparações, simulações
-- ---------------------------------------------------------------------
create table situacao (
  id                   uuid primary key default gen_random_uuid(),
  empresa_id           uuid not null references empresa(id) on delete cascade,
  autor_user_id        uuid not null default auth.uid() references auth.users(id),
  lider_id             uuid not null references colaborador(id),
  colaborador_id       uuid references colaborador(id),     -- null = situação de grupo
  grupo_descricao      text,
  tipo                 tipo_situacao not null,
  frente               frente_gestao not null,
  titulo               text not null,
  relato_inicial       text,
  status               status_situacao not null default 'rascunho',
  sensivel             boolean not null default false,       -- ativa modo encaminhamento
  compartilhada_mentor boolean not null default false,
  data_prevista        timestamptz,
  aplicada_em          timestamptz,          -- quando a conversa real aconteceu
  relato_aplicacao     text,                 -- o que o líder registra depois da conversa
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  -- ensaio não vira aplicação: só é "aplicada" com data registrada
  constraint situacao_aplicada_exige_data check (status <> 'aplicada' or aplicada_em is not null)
);
create index situacao_lider_idx on situacao (lider_id, status);
create index situacao_colab_idx on situacao (colaborador_id);

create table preparacao (
  id               uuid primary key default gen_random_uuid(),
  situacao_id      uuid not null references situacao(id) on delete cascade,
  empresa_id       uuid not null references empresa(id) on delete cascade,
  versao           int not null,
  conteudo         jsonb not null,             -- schema em docs/03-ia-contexto-skills-guardrails.md §4
  gerado_por       text not null check (gerado_por in ('ia','lider')),
  interacao_ia_id  uuid,
  revisada         boolean not null default false,
  criado_por       uuid not null default auth.uid(),
  criado_em        timestamptz not null default now(),
  unique (situacao_id, versao)
);

create table simulacao (
  id           uuid primary key default gen_random_uuid(),
  situacao_id  uuid not null references situacao(id) on delete cascade,
  empresa_id   uuid not null references empresa(id) on delete cascade,
  intensidade  text not null default 'moderada' check (intensidade in ('receptiva','moderada','desafiadora')),
  mensagens    jsonb not null default '[]'::jsonb,
  debrief      jsonb,
  criado_por   uuid not null default auth.uid(),
  criado_em    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Registro direto, combinados, lembretes, desenvolvimento
-- ---------------------------------------------------------------------
create table registro (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa(id) on delete cascade,
  colaborador_id  uuid not null references colaborador(id),
  situacao_id     uuid references situacao(id),
  autor_user_id   uuid not null default auth.uid() references auth.users(id),
  tipo            tipo_registro not null,
  texto           text not null,
  data_fato       date not null default current_date,
  visibilidade    visibilidade_registro not null default 'linha_gestao',
  criado_em       timestamptz not null default now()
);
create index registro_colab_idx on registro (colaborador_id, data_fato desc);

-- Fontes (transcrições, anotações, documentos)
create table documento_fonte (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresa(id) on delete cascade,
  lider_id              uuid references colaborador(id),     -- líder dono do contexto
  enviado_por           uuid not null default auth.uid() references auth.users(id),
  tipo                  tipo_documento not null,
  titulo                text not null,
  data_evento           date,
  storage_path          text,
  formato               text,          -- gemini_notas | vtt | docx | pdf | txt | md
  status_processamento  status_processamento not null default 'recebido',
  erro                  text,
  participantes_avisados boolean not null default false,
  criado_em             timestamptz not null default now(),
  -- reunião ou mentoria só vira fonte com aviso aos participantes
  constraint doc_reuniao_exige_aviso check (
    tipo not in ('transcricao_mentoria','transcricao_reuniao','anotacao_reuniao') or participantes_avisados)
);

create table documento_colaborador (
  documento_id    uuid not null references documento_fonte(id) on delete cascade,
  colaborador_id  uuid not null references colaborador(id) on delete cascade,
  confirmado      boolean not null default false,
  primary key (documento_id, colaborador_id)
);

create table trecho (
  id            uuid primary key default gen_random_uuid(),
  documento_id  uuid not null references documento_fonte(id) on delete cascade,
  empresa_id    uuid not null references empresa(id) on delete cascade,
  ordem         int not null,
  locutor       text,
  inicio_seg    int,
  texto         text not null,
  busca         tsvector generated always as (to_tsvector('portuguese', texto)) stored,
  unique (documento_id, ordem)
);
create index trecho_busca_idx on trecho using gin (busca);

create table extracao (
  id              uuid primary key default gen_random_uuid(),
  documento_id    uuid not null references documento_fonte(id) on delete cascade,
  empresa_id      uuid not null references empresa(id) on delete cascade,
  trecho_id       uuid references trecho(id),
  tipo            text not null check (tipo in ('combinado','decisao','tema')),
  conteudo        jsonb not null,
  confianca       numeric(3,2),
  status_revisao  status_revisao not null default 'pendente',
  criado_em       timestamptz not null default now()
);

create table combinado (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresa(id) on delete cascade,
  lider_id              uuid not null references colaborador(id),
  colaborador_id        uuid references colaborador(id),
  situacao_id           uuid references situacao(id),
  documento_id          uuid references documento_fonte(id),
  trecho_id             uuid references trecho(id),
  descricao             text not null,
  responsavel_tipo      text not null check (responsavel_tipo in ('lider','colaborador','outro')),
  responsavel_nome      text,
  prazo                 date,
  status                status_combinado not null default 'pendente_revisao',
  origem                origem_combinado not null,
  evidencia_esperada    text,
  evidencia_registrada  text,
  concluido_em          date,
  criado_por            uuid not null default auth.uid(),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);
create index combinado_lider_idx on combinado (lider_id, status, prazo);

create table lembrete (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresa(id) on delete cascade,
  combinado_id          uuid not null references combinado(id) on delete cascade,
  destinatario_user_id  uuid not null references auth.users(id) on delete cascade,
  canal                 text not null default 'inapp' check (canal in ('inapp','email')),
  enviar_em             timestamptz not null,
  enviado_em            timestamptz,
  lido_em               timestamptz
);
create index lembrete_fila_idx on lembrete (enviar_em) where enviado_em is null;

-- Ação de desenvolvimento: deliberadamente leve.
-- empresa.config.modo_pdi decide o papel (ver docs/01 §3):
--   'boomit'    → referência ao PDI da Boomit (Projeto Performance)
--   'integrado' → referencia_externa aponta para o sistema interno da empresa
--   'nativo'    → o Copiloto guarda a ação
create table acao_desenvolvimento (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresa(id) on delete cascade,
  colaborador_id      uuid not null references colaborador(id),
  situacao_id         uuid references situacao(id),
  descricao           text not null,
  competencia         text,
  prazo               date,
  status              text not null default 'planejada' check (status in ('planejada','em_andamento','concluida','cancelada')),
  origem              text not null default 'copiloto' check (origem in ('copiloto','boomit_pdi','sistema_interno')),
  referencia_externa  text,
  criado_por          uuid not null default auth.uid(),
  criado_em           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Governança: log de IA (metadados) e auditoria
-- ---------------------------------------------------------------------
create table interacao_ia (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresa(id) on delete cascade,
  user_id           uuid not null default auth.uid(),
  situacao_id       uuid references situacao(id),
  finalidade        text not null,     -- preparacao | simulacao | debrief | extracao | classificacao | skill:<slug>
  modelo            text not null,
  skills_aplicadas  text[] not null default '{}',
  fontes_ids        text[] not null default '{}',
  tokens_entrada    int,
  tokens_saida      int,
  custo_estimado    numeric(10,4),
  latencia_ms       int,
  avaliacao_lider   smallint check (avaliacao_lider in (-1, 1)),
  criado_em         timestamptz not null default now()
);

create table auditoria (
  id           bigint generated always as identity primary key,
  empresa_id   uuid,
  tabela       text not null,
  registro_id  uuid,
  acao         text not null,
  ator         uuid default auth.uid(),
  antes        jsonb,
  depois       jsonb,
  em           timestamptz not null default now()
);
create index auditoria_registro_idx on auditoria (tabela, registro_id);

-- =====================================================================
-- Funções de apoio às políticas (security definer: evitam recursão de RLS)
-- =====================================================================
create or replace function eh_membro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membro where user_id = auth.uid() and empresa_id = p_empresa);
$$;

create or replace function tem_papel(p_empresa uuid, p_papeis papel_usuario[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from membro
                 where user_id = auth.uid() and empresa_id = p_empresa and papel = any (p_papeis));
$$;

create or replace function eh_admin(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select tem_papel(p_empresa, array['admin_empresa','admin_boomit']::papel_usuario[]);
$$;

create or replace function meu_colaborador_id(p_empresa uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select colaborador_id from membro
  where user_id = auth.uid() and empresa_id = p_empresa and colaborador_id is not null
  limit 1;
$$;

create or replace function exibe_sensiveis(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((config->>'exibir_indicadores_sensiveis')::boolean, false) from empresa where id = p_empresa;
$$;

-- p_lider lidera p_alvo direta ou indiretamente (UNION evita laço em ciclos).
create or replace function lidera(p_lider uuid, p_alvo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive cadeia(id) as (
    select liderado_id from vinculo_lideranca where lider_id = p_lider and fim is null
    union
    select v.liderado_id from vinculo_lideranca v join cadeia c on v.lider_id = c.id where v.fim is null
  )
  select exists (select 1 from cadeia where id = p_alvo);
$$;

create or replace function sou_mentor_de(p_lider uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mentoria where mentor_user_id = auth.uid() and lider_id = p_lider and ativo);
$$;

-- Quem pode ver o contexto de um colaborador:
--   admin da empresa · o próprio · quem o lidera (direta/indiretamente)
--   · mentor do líder dele (ou dele mesmo, se for líder mentorado)
create or replace function pode_ver_colaborador(p_colaborador uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from colaborador c
    join membro m on m.empresa_id = c.empresa_id and m.user_id = auth.uid()
    where c.id = p_colaborador
      and (
        m.papel in ('admin_empresa','admin_boomit')
        or (m.colaborador_id is not null and (m.colaborador_id = c.id or lidera(m.colaborador_id, c.id)))
        or (m.papel = 'mentor' and exists (
              select 1 from mentoria mt
              where mt.mentor_user_id = auth.uid() and mt.ativo
                and (mt.lider_id = c.id or lidera(mt.lider_id, c.id))))
      )
  );
$$;

create or replace function pode_ver_situacao(p_situacao uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from situacao s
    where s.id = p_situacao
      and (s.autor_user_id = auth.uid() or (s.compartilhada_mentor and sou_mentor_de(s.lider_id)))
  );
$$;

create or replace function pode_ver_documento(p_documento uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from documento_fonte d
    where d.id = p_documento
      and (
        d.enviado_por = auth.uid()
        or (d.lider_id is not null and (d.lider_id = meu_colaborador_id(d.empresa_id) or sou_mentor_de(d.lider_id)))
      )
  );
$$;

-- Painel da gestão superior: só contagens e prazos, nunca conteúdo.
create or replace function andamento_lideranca(p_empresa uuid)
returns table (
  lider_id                  uuid,
  lider_nome                text,
  situacoes_preparadas      bigint,
  situacoes_aplicadas       bigint,
  situacoes_encaminhadas    bigint,
  combinados_abertos        bigint,
  combinados_vencidos       bigint,
  combinados_cumpridos      bigint,
  combinados_no_prazo_pct   numeric
)
language sql stable security definer set search_path = public as $$
  with eu as (
    select colaborador_id, papel from membro where user_id = auth.uid() and empresa_id = p_empresa
  ),
  lideres as (
    select c.id, c.nome from colaborador c
    where c.empresa_id = p_empresa
      and exists (select 1 from vinculo_lideranca v where v.lider_id = c.id and v.fim is null)
      and (
        exists (select 1 from eu where papel in ('admin_empresa','admin_boomit'))
        or exists (select 1 from eu where eu.colaborador_id is not null and lidera(eu.colaborador_id, c.id))
      )
  )
  select
    l.id, l.nome,
    (select count(*) from situacao s where s.lider_id = l.id and s.status not in ('rascunho','encaminhada')),
    (select count(*) from situacao s where s.lider_id = l.id and s.status in ('aplicada','em_acompanhamento','encerrada')),
    (select count(*) from situacao s where s.lider_id = l.id and s.status = 'encaminhada'),
    (select count(*) from combinado k where k.lider_id = l.id and k.status = 'aberto'),
    (select count(*) from combinado k where k.lider_id = l.id and k.status = 'aberto' and k.prazo < current_date),
    (select count(*) from combinado k where k.lider_id = l.id and k.status = 'cumprido'),
    (select round(100.0 * count(*) filter (where k.concluido_em <= k.prazo) / nullif(count(*), 0), 1)
       from combinado k where k.lider_id = l.id and k.status = 'cumprido' and k.prazo is not null)
  from lideres l;
$$;

-- =====================================================================
-- Linha do tempo do colaborador, com a natureza de cada item explícita.
-- security_invoker: cada linha respeita a RLS da tabela de origem
-- (ensaios só aparecem para o autor).
--   ensaio        → simulação (nunca é aplicação)
--   relato_lider  → registro feito pelo líder
--   aplicacao     → conversa real registrada (aplicada_em)
--   combinado     → combinado confirmado
--   fonte         → reunião/mentoria/documento vinculado e confirmado
-- Eventos da Boomit (assessment, Focus, devolutiva, PDI) vêm de
-- contexto_colaborador e são compostos na interface com natureza 'boomit'.
-- =====================================================================
create view linha_do_tempo with (security_invoker = true) as
  select r.empresa_id, r.colaborador_id, r.data_fato::timestamptz as quando,
         'relato_lider'::text as natureza, r.tipo::text as subtipo, r.texto as resumo,
         r.id as origem_id, 'registro'::text as origem_tabela
    from registro r
  union all
  select s.empresa_id, s.colaborador_id, s.aplicada_em, 'aplicacao', s.tipo::text, s.titulo, s.id, 'situacao'
    from situacao s where s.aplicada_em is not null and s.colaborador_id is not null
  union all
  select s.empresa_id, s.colaborador_id, sm.criado_em, 'ensaio', s.tipo::text, s.titulo, sm.id, 'simulacao'
    from simulacao sm join situacao s on s.id = sm.situacao_id where s.colaborador_id is not null
  union all
  select k.empresa_id, k.colaborador_id, coalesce(k.concluido_em::timestamptz, k.criado_em), 'combinado',
         k.status::text, k.descricao, k.id, 'combinado'
    from combinado k where k.colaborador_id is not null and k.status <> 'pendente_revisao'
  union all
  select d.empresa_id, dc.colaborador_id, coalesce(d.data_evento::timestamptz, d.criado_em), 'fonte',
         d.tipo::text, d.titulo, d.id, 'documento_fonte'
    from documento_fonte d join documento_colaborador dc on dc.documento_id = d.id where dc.confirmado;

-- =====================================================================
-- Triggers: atualizado_em e auditoria
-- =====================================================================
create or replace function tocar_atualizado_em() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;

create trigger situacao_atualizado  before update on situacao  for each row execute function tocar_atualizado_em();
create trigger combinado_atualizado before update on combinado for each row execute function tocar_atualizado_em();

-- Auditoria. Modo 'metadados' (argumento do trigger) grava só campos de controle,
-- para que o log não exponha conteúdo de ensaios privados a quem lê a auditoria.
-- Registros privados e combinados ainda em revisão também caem em 'metadados'.
create or replace function auditoria_metadados(j jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from jsonb_each(j)
  where key in ('id','empresa_id','situacao_id','documento_id','lider_id','colaborador_id','autor_user_id',
                'criado_por','tipo','frente','status','status_revisao','versao','visibilidade',
                'sensivel','compartilhada_mentor','prazo','aplicada_em','criado_em','atualizado_em');
$$;

create or replace function registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v      jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  modo   text  := coalesce(tg_argv[0], 'completo');
  v_old  jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new  jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
begin
  if v->>'visibilidade' = 'privado' or v->>'status' = 'pendente_revisao'
     or v_old->>'visibilidade' = 'privado' or v_old->>'status' = 'pendente_revisao' then
    modo := 'metadados';
  end if;
  if modo = 'metadados' then
    v_old := case when v_old is not null then auditoria_metadados(v_old) end;
    v_new := case when v_new is not null then auditoria_metadados(v_new) end;
  end if;
  insert into auditoria (empresa_id, tabela, registro_id, acao, antes, depois)
  values (nullif(v->>'empresa_id','')::uuid, tg_table_name, nullif(v->>'id','')::uuid, tg_op, v_old, v_new);
  return coalesce(new, old);
end $$;

-- Ensaios privados e conteúdo de transcrições: só metadados.
create trigger situacao_auditoria   after insert or update or delete on situacao   for each row execute function registrar_auditoria('metadados');
create trigger preparacao_auditoria after insert or update or delete on preparacao for each row execute function registrar_auditoria('metadados');
create trigger extracao_auditoria   after insert or update or delete on extracao   for each row execute function registrar_auditoria('metadados');
-- Registros de gestão e configuração: conteúdo completo.
do $$
declare t text;
begin
  foreach t in array array['registro','combinado','acao_desenvolvimento','skill','alcada','vinculo_lideranca','mentoria']
  loop
    execute format('create trigger %I after insert or update or delete on %I
                    for each row execute function registrar_auditoria(''completo'')', t || '_auditoria', t);
  end loop;
end $$;

-- =====================================================================
-- RLS
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['empresa','colaborador','membro','vinculo_lideranca','mentoria',
                           'conector_execucao','boomit_snapshot','contexto_empresa','contexto_colaborador','contexto_colaborador_sensivel',
                           'competencia_sinonimo','alcada','skill','skill_conhecimento',
                           'situacao','preparacao','simulacao','registro',
                           'documento_fonte','documento_colaborador','trecho','extracao',
                           'combinado','lembrete','acao_desenvolvimento','interacao_ia','auditoria']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Empresa, pessoas, hierarquia
create policy empresa_ler      on empresa      for select using (eh_membro(id));
create policy empresa_admin    on empresa      for update using (eh_admin(id));

create policy colaborador_ler   on colaborador for select using (pode_ver_colaborador(id));
create policy colaborador_admin on colaborador for all    using (eh_admin(empresa_id)) with check (eh_admin(empresa_id));

create policy membro_ler   on membro for select using (user_id = auth.uid() or eh_admin(empresa_id));
create policy membro_admin on membro for all    using (eh_admin(empresa_id)) with check (eh_admin(empresa_id));

create policy vinculo_ler   on vinculo_lideranca for select using (eh_admin(empresa_id) or pode_ver_colaborador(liderado_id));
create policy vinculo_admin on vinculo_lideranca for all    using (eh_admin(empresa_id)) with check (eh_admin(empresa_id));

create policy mentoria_ler   on mentoria for select using (mentor_user_id = auth.uid() or eh_admin(empresa_id));
create policy mentoria_admin on mentoria for all    using (eh_admin(empresa_id)) with check (eh_admin(empresa_id));

-- Dados Boomit: escrita apenas via service role (conector). Leitura do bruto só admin.
create policy execucao_ler  on conector_execucao for select using (eh_admin(empresa_id));
create policy snapshot_ler  on boomit_snapshot   for select using (eh_admin(empresa_id));
create policy ctx_emp_ler   on contexto_empresa  for select using (eh_membro(empresa_id));
create policy ctx_col_ler   on contexto_colaborador for select using (pode_ver_colaborador(colaborador_id));
create policy ctx_sens_ler  on contexto_colaborador_sensivel for select
  using (pode_ver_colaborador(colaborador_id) and (eh_admin(empresa_id) or exibe_sensiveis(empresa_id)));
create policy sinonimo_ler  on competencia_sinonimo for select to authenticated using (true);

-- Configuração
create policy alcada_ler   on alcada for select using (eh_membro(empresa_id));
create policy alcada_admin on alcada for all    using (eh_admin(empresa_id)) with check (eh_admin(empresa_id));

create policy skill_ler   on skill for select using (empresa_id is null or eh_membro(empresa_id));
create policy skill_admin on skill for all    using (empresa_id is not null and eh_admin(empresa_id))
                                              with check (empresa_id is not null and eh_admin(empresa_id));
create policy skill_conh_ler on skill_conhecimento for select
  using (exists (select 1 from skill s where s.id = skill_id and (s.empresa_id is null or eh_membro(s.empresa_id))));
create policy skill_conh_admin on skill_conhecimento for all
  using (exists (select 1 from skill s where s.id = skill_id and s.empresa_id is not null and eh_admin(s.empresa_id)))
  with check (exists (select 1 from skill s where s.id = skill_id and s.empresa_id is not null and eh_admin(s.empresa_id)));

-- Situações: ensaio privado do líder (admin NÃO lê conteúdo).
create policy situacao_ler on situacao for select using (pode_ver_situacao(id));
create policy situacao_criar on situacao for insert with check (
  autor_user_id = auth.uid()
  and eh_membro(empresa_id)
  and lider_id = meu_colaborador_id(empresa_id)
  and (colaborador_id is null or pode_ver_colaborador(colaborador_id))
);
create policy situacao_editar on situacao for update using (autor_user_id = auth.uid()) with check (autor_user_id = auth.uid());
-- Sem delete: encerrar via status (governança).

create policy preparacao_ler   on preparacao for select using (pode_ver_situacao(situacao_id));
create policy preparacao_criar on preparacao for insert with check (
  exists (select 1 from situacao s where s.id = situacao_id and s.autor_user_id = auth.uid()));
create policy preparacao_editar on preparacao for update using (criado_por = auth.uid());

create policy simulacao_ler   on simulacao for select using (pode_ver_situacao(situacao_id));
create policy simulacao_criar on simulacao for insert with check (
  exists (select 1 from situacao s where s.id = situacao_id and s.autor_user_id = auth.uid()));
create policy simulacao_editar on simulacao for update using (criado_por = auth.uid());

-- Registro direto
create policy registro_ler on registro for select using (
  autor_user_id = auth.uid() or (visibilidade = 'linha_gestao' and pode_ver_colaborador(colaborador_id)));
create policy registro_criar on registro for insert with check (
  autor_user_id = auth.uid() and pode_ver_colaborador(colaborador_id));
create policy registro_editar on registro for update using (autor_user_id = auth.uid()) with check (autor_user_id = auth.uid());

-- Fontes
create policy doc_ler   on documento_fonte for select using (pode_ver_documento(id));
create policy doc_criar on documento_fonte for insert with check (enviado_por = auth.uid() and eh_membro(empresa_id));
create policy doc_editar on documento_fonte for update using (enviado_por = auth.uid());

create policy doc_colab_ler   on documento_colaborador for select using (pode_ver_documento(documento_id));
create policy doc_colab_gerir on documento_colaborador for all
  using (pode_ver_documento(documento_id)) with check (pode_ver_documento(documento_id) and pode_ver_colaborador(colaborador_id));

create policy trecho_ler   on trecho   for select using (pode_ver_documento(documento_id));
create policy extracao_ler on extracao for select using (pode_ver_documento(documento_id));
create policy extracao_revisar on extracao for update using (pode_ver_documento(documento_id));

-- Combinados: pendente_revisao é do autor; confirmados viram registro da linha de gestão.
create policy combinado_ler on combinado for select using (
  criado_por = auth.uid() or (status <> 'pendente_revisao' and pode_ver_colaborador(lider_id)));
create policy combinado_criar on combinado for insert with check (
  criado_por = auth.uid() and lider_id = meu_colaborador_id(empresa_id));
create policy combinado_editar on combinado for update using (
  criado_por = auth.uid() or lider_id = meu_colaborador_id(empresa_id));

create policy lembrete_ler    on lembrete for select using (destinatario_user_id = auth.uid());
create policy lembrete_marcar on lembrete for update using (destinatario_user_id = auth.uid());

create policy acao_ler   on acao_desenvolvimento for select using (pode_ver_colaborador(colaborador_id));
create policy acao_criar on acao_desenvolvimento for insert with check (criado_por = auth.uid() and pode_ver_colaborador(colaborador_id));
create policy acao_editar on acao_desenvolvimento for update using (criado_por = auth.uid());

-- Governança
create policy ia_ler   on interacao_ia for select using (user_id = auth.uid() or eh_admin(empresa_id));
create policy ia_criar on interacao_ia for insert with check (user_id = auth.uid() and eh_membro(empresa_id));
create policy ia_avaliar on interacao_ia for update using (user_id = auth.uid());

create policy auditoria_ler on auditoria for select using (eh_admin(empresa_id));
-- auditoria: sem insert/update/delete para usuários (só o trigger grava).
