-- 0007 · Inclusões de 08/11/2026: apoio à decisão, agenda da liderança, régua de comunicação
-- por e-mail e insights semanais.
-- Privacidade: agenda, decisões, e-mails e insights são do líder (como os ensaios): ninguém
-- além do próprio usuário lê. Testes em supabase/tests/database/agenda_decisoes.test.sql.

-- ---------------------------------------------------------------------
-- Agenda: compromissos do líder (agendados e realizados)
-- ---------------------------------------------------------------------
create type tipo_compromisso as enum ('um_a_um', 'feedback', 'pdi', 'conversa', 'reuniao_equipe', 'mentoria', 'outro');
create type status_compromisso as enum ('agendado', 'realizado', 'cancelado');

create table compromisso (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa(id) on delete cascade,
  lider_id        uuid not null references colaborador(id),
  colaborador_id  uuid references colaborador(id),
  situacao_id     uuid references situacao(id) on delete set null,
  tipo            tipo_compromisso not null,
  titulo          text not null,
  inicio          timestamptz not null,
  duracao_min     int not null default 30 check (duracao_min between 5 and 480),
  local           text,
  observacao      text,
  status          status_compromisso not null default 'agendado',
  realizado_em    timestamptz,
  relato          text,
  criado_por      uuid not null default auth.uid() references auth.users(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint compromisso_realizado_exige_data check (status <> 'realizado' or realizado_em is not null)
);
create index compromisso_agenda_idx on compromisso (criado_por, inicio);

-- ---------------------------------------------------------------------
-- Decisões: apoio à tomada de decisão do líder (qualquer decisão, não só sobre pessoas)
-- ---------------------------------------------------------------------
create type status_decisao as enum ('em_analise', 'decidida', 'revisada', 'cancelada');

create table decisao (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresa(id) on delete cascade,
  lider_id           uuid not null references colaborador(id),
  colaborador_id     uuid references colaborador(id),          -- pessoa mais afetada, se houver
  titulo             text not null,
  pergunta           text not null,                            -- o que precisa ser decidido
  contexto           text,
  opcoes_iniciais    text[] not null default '{}',
  prazo_decisao      date,
  status             status_decisao not null default 'em_analise',
  sensivel           boolean not null default false,
  analise            jsonb,                                    -- saída verificada do motor
  versao_analise     int not null default 0,
  opcao_escolhida    text,
  justificativa      text,
  decidida_em        timestamptz,
  revisar_em         date,
  resultado_revisao  text,
  criado_por         uuid not null default auth.uid() references auth.users(id),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint decisao_decidida_exige_opcao check (status not in ('decidida', 'revisada') or (opcao_escolhida is not null and decidida_em is not null))
);
create index decisao_lider_idx on decisao (criado_por, status);

create trigger compromisso_atualizado before update on compromisso for each row execute function tocar_atualizado_em();
create trigger decisao_atualizado     before update on decisao     for each row execute function tocar_atualizado_em();
-- Auditoria só de metadados: são registros privados do líder.
create trigger compromisso_auditoria after insert or update or delete on compromisso for each row execute function registrar_auditoria('metadados');
create trigger decisao_auditoria     after insert or update or delete on decisao     for each row execute function registrar_auditoria('metadados');

alter table compromisso enable row level security;
alter table decisao enable row level security;

create policy compromisso_ler    on compromisso for select using (criado_por = auth.uid());
create policy compromisso_criar  on compromisso for insert with check (
  criado_por = auth.uid() and lider_id = meu_colaborador_id(empresa_id)
  and (colaborador_id is null or pode_ver_colaborador(colaborador_id)));
create policy compromisso_editar on compromisso for update using (criado_por = auth.uid()) with check (criado_por = auth.uid());
create policy compromisso_apagar on compromisso for delete using (criado_por = auth.uid());

create policy decisao_ler    on decisao for select using (criado_por = auth.uid());
create policy decisao_criar  on decisao for insert with check (
  criado_por = auth.uid() and lider_id = meu_colaborador_id(empresa_id)
  and (colaborador_id is null or pode_ver_colaborador(colaborador_id)));
create policy decisao_editar on decisao for update using (criado_por = auth.uid()) with check (criado_por = auth.uid());

-- ---------------------------------------------------------------------
-- Régua de comunicação: lembretes por etapa, em dois canais (app e e-mail)
-- ---------------------------------------------------------------------
alter table lembrete alter column combinado_id drop not null;
alter table lembrete add column if not exists compromisso_id uuid references compromisso(id) on delete cascade;
alter table lembrete add column if not exists decisao_id uuid references decisao(id) on delete cascade;
alter table lembrete add column if not exists etapa text not null default 'prazo';
alter table lembrete add constraint lembrete_uma_origem check (num_nonnulls(combinado_id, compromisso_id, decisao_id) = 1);
create index if not exists lembrete_email_fila_idx on lembrete (enviar_em) where enviado_em is null and canal = 'email';

-- Insere a etapa nos canais pedidos, nunca no passado.
create or replace function regua_agendar(
  p_empresa uuid, p_destinatario uuid, p_etapa text, p_quando timestamptz, p_canais text[],
  p_combinado uuid default null, p_compromisso uuid default null, p_decisao uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_canal text;
begin
  if p_quando is null or p_destinatario is null then return; end if;
  foreach v_canal in array p_canais loop
    insert into lembrete (empresa_id, combinado_id, compromisso_id, decisao_id, destinatario_user_id, canal, etapa, enviar_em)
    values (p_empresa, p_combinado, p_compromisso, p_decisao, p_destinatario, v_canal, p_etapa, greatest(p_quando, now()));
  end loop;
end $$;
revoke execute on function regua_agendar(uuid, uuid, text, timestamptz, text[], uuid, uuid, uuid) from public, anon, authenticated;

-- Combinados: D-2 e D0 (ou empresa.config.lembretes_dias) e "vencido" no dia seguinte, nos dois canais.
create or replace function combinado_gerar_lembretes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_dias int[];
  v_dia int;
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.prazo is not distinct from old.prazo then
    return new;
  end if;
  delete from lembrete where combinado_id = new.id and enviado_em is null;
  if new.status in ('aberto', 'renegociado') and new.prazo is not null then
    select case when jsonb_typeof(config->'lembretes_dias') = 'array' and jsonb_array_length(config->'lembretes_dias') > 0
                then array(select jsonb_array_elements_text(config->'lembretes_dias')::int)
                else array[2, 0] end
      into v_dias from empresa where id = new.empresa_id;
    foreach v_dia in array coalesce(v_dias, array[2, 0]) loop
      perform regua_agendar(new.empresa_id, new.criado_por, case when v_dia = 0 then 'prazo_hoje' else 'prazo_d' || v_dia end,
        ((new.prazo - v_dia)::timestamp + time '09:00') at time zone 'America/Sao_Paulo', array['inapp', 'email'], p_combinado := new.id);
    end loop;
    perform regua_agendar(new.empresa_id, new.criado_por, 'vencido',
      ((new.prazo + 1)::timestamp + time '09:00') at time zone 'America/Sao_Paulo', array['inapp', 'email'], p_combinado := new.id);
  end if;
  return new;
end $$;

-- Compromissos: confirmação ao agendar (e-mail), véspera (app + e-mail), 1 hora antes (app)
-- e pós-evento "registre como foi" (app + e-mail; o envio confere se ainda está agendado).
create or replace function compromisso_gerar_lembretes() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_fim timestamptz;
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.inicio = old.inicio and new.duracao_min = old.duracao_min then
    return new;
  end if;
  delete from lembrete where compromisso_id = new.id and enviado_em is null;
  if new.status = 'agendado' then
    v_fim := new.inicio + make_interval(mins => new.duracao_min);
    if new.inicio > now() then
      perform regua_agendar(new.empresa_id, new.criado_por, case when tg_op = 'INSERT' then 'confirmacao' else 'remarcado' end,
        now(), array['email'], p_compromisso := new.id);
      if new.inicio - interval '1 day' > now() then
        perform regua_agendar(new.empresa_id, new.criado_por, 'vespera', new.inicio - interval '1 day', array['inapp', 'email'], p_compromisso := new.id);
      end if;
      perform regua_agendar(new.empresa_id, new.criado_por, 'em_breve', new.inicio - interval '1 hour', array['inapp'], p_compromisso := new.id);
    end if;
    perform regua_agendar(new.empresa_id, new.criado_por, 'pos_evento', v_fim + interval '2 hours', array['inapp', 'email'], p_compromisso := new.id);
  end if;
  return new;
end $$;

create trigger compromisso_lembretes after insert or update on compromisso
  for each row execute function compromisso_gerar_lembretes();

-- Decisões: véspera do prazo para decidir e dia da revisão.
create or replace function decisao_gerar_lembretes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.prazo_decisao is not distinct from old.prazo_decisao
     and new.revisar_em is not distinct from old.revisar_em then
    return new;
  end if;
  delete from lembrete where decisao_id = new.id and enviado_em is null;
  if new.status = 'em_analise' and new.prazo_decisao is not null then
    perform regua_agendar(new.empresa_id, new.criado_por, 'decisao_prazo',
      ((new.prazo_decisao - 1)::timestamp + time '09:00') at time zone 'America/Sao_Paulo', array['inapp', 'email'], p_decisao := new.id);
  elsif new.status = 'decidida' and new.revisar_em is not null then
    perform regua_agendar(new.empresa_id, new.criado_por, 'decisao_revisao',
      (new.revisar_em::timestamp + time '09:00') at time zone 'America/Sao_Paulo', array['inapp', 'email'], p_decisao := new.id);
  end if;
  return new;
end $$;

create trigger decisao_lembretes after insert or update on decisao
  for each row execute function decisao_gerar_lembretes();

-- ---------------------------------------------------------------------
-- Fila de e-mails (régua e insights) e insights semanais
-- ---------------------------------------------------------------------
create table email_envio (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresa(id) on delete cascade,
  destinatario_user_id  uuid not null references auth.users(id) on delete cascade,
  para                  text not null,
  tipo                  text not null check (tipo in ('lembrete', 'insights_semanais')),
  etapa                 text,
  assunto               text not null,
  html                  text not null,
  texto                 text not null,
  lembrete_id           uuid unique references lembrete(id) on delete set null,
  status                text not null default 'pendente'
                        check (status in ('pendente', 'enviado', 'erro', 'aguardando_provedor', 'bloqueado_demo', 'descartado')),
  tentativas            int not null default 0,
  erro                  text,
  provedor_id           text,
  criado_em             timestamptz not null default now(),
  enviado_em            timestamptz
);
create index email_envio_fila_idx on email_envio (status, criado_em);

create table insight_semanal (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresa(id) on delete cascade,
  lider_id              uuid not null references colaborador(id),
  destinatario_user_id  uuid not null references auth.users(id) on delete cascade,
  semana_inicio         date not null,
  conteudo              jsonb not null,
  modelo                text,
  gerado_em             timestamptz not null default now(),
  unique (destinatario_user_id, semana_inicio)
);

alter table email_envio enable row level security;
alter table insight_semanal enable row level security;
-- Cada um vê só os próprios e-mails e insights (caixa de saída e cartão da semana). Escrita só pelas funções.
create policy email_ler   on email_envio     for select using (destinatario_user_id = auth.uid());
create policy insight_ler on insight_semanal for select using (destinatario_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Configuração do sistema (endereços), lida só pelo banco e pelas funções
-- ---------------------------------------------------------------------
create table config_sistema (chave text primary key, valor text not null);
alter table config_sistema enable row level security;   -- sem políticas: usuários não leem
-- Segredo que o agendador manda às funções (elas conferem lendo esta tabela com service_role).
insert into config_sistema (chave, valor)
values ('segredo_agendador', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (chave) do nothing;

-- ---------------------------------------------------------------------
-- Agendamentos: envios a cada 15 min e insights às segundas, 7h de São Paulo (10h UTC).
-- 'url_funcoes' é gravada por `npm run db:agendador` (nenhuma URL de projeto fixa no código).
-- ---------------------------------------------------------------------
create or replace function chamar_funcao(p_funcao text) returns void
language plpgsql security definer set search_path = public as $$
declare v_url text; v_segredo text;
begin
  if auth.uid() is not null then
    raise exception 'só o agendador chama as funções de envio' using errcode = '42501';
  end if;
  select valor into v_url from config_sistema where chave = 'url_funcoes';
  select valor into v_segredo from config_sistema where chave = 'segredo_agendador';
  if v_url is null or v_segredo is null then return; end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3)'
    using v_url || '/' || p_funcao,
          jsonb_build_object('Content-Type', 'application/json', 'x-agendador', v_segredo),
          '{"origem": "agendador"}'::jsonb;
end $$;
revoke execute on function chamar_funcao(text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    perform cron.unschedule(jobid) from cron.job where jobname in ('copiloto-envios', 'copiloto-insights');
    perform cron.schedule('copiloto-envios', '*/15 * * * *', 'select public.chamar_funcao(''processar-envios'')');
    perform cron.schedule('copiloto-insights', '0 10 * * 1', 'select public.chamar_funcao(''insights-semanais'')');
  else
    raise notice 'pg_cron/pg_net indisponíveis: envios e insights não agendados neste banco';
  end if;
end $$;
