-- 0006 · Sprint 6: histórico de combinados, lembretes automáticos e drill-down do painel.
-- RLS: tabelas já protegidas desde a 0001 (combinado, lembrete); a função nova é security definer
-- e só devolve prazos para quem lidera o líder (ou admin). Testes em
-- supabase/tests/database/lembretes.test.sql.

-- ---------------------------------------------------------------------
-- Histórico: toda mudança de status ou prazo fica registrada no próprio combinado,
-- visível para quem já pode ver o combinado. Renegociar nunca apaga o prazo anterior.
-- ---------------------------------------------------------------------
alter table combinado add column if not exists historico jsonb not null default '[]'::jsonb;
-- Nota da mudança (motivo da renegociação, evidência, etc.): o trigger move para o histórico.
alter table combinado add column if not exists nota_mudanca text;

create or replace function combinado_registrar_historico() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status or new.prazo is distinct from old.prazo then
    new.historico := coalesce(old.historico, '[]'::jsonb) || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'em', now(),
      'ator', auth.uid(),
      'status_de', old.status, 'status_para', new.status,
      'prazo_de', old.prazo, 'prazo_para', new.prazo,
      'nota', nullif(new.nota_mudanca, '')
    )));
  end if;
  new.nota_mudanca := null;
  return new;
end $$;

drop trigger if exists combinado_historico on combinado;
create trigger combinado_historico before update on combinado
  for each row execute function combinado_registrar_historico();

-- ---------------------------------------------------------------------
-- Lembretes: D-2 e D0 por padrão (empresa.config.lembretes_dias), às 9h de São Paulo,
-- para quem criou o combinado. Reabrir/renegociar recria; encerrar apaga os pendentes.
-- ---------------------------------------------------------------------
create or replace function combinado_gerar_lembretes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_dias int[];
  v_dia int;
  v_quando timestamptz;
begin
  if tg_op = 'UPDATE' and new.status = old.status and new.prazo is not distinct from old.prazo then
    return new;
  end if;
  delete from lembrete where combinado_id = new.id and enviado_em is null;
  if new.status in ('aberto', 'renegociado') and new.prazo is not null then
    -- Sem configuração (ou lista vazia), vale o padrão D-2 e D0.
    select case when jsonb_typeof(config->'lembretes_dias') = 'array' and jsonb_array_length(config->'lembretes_dias') > 0
                then array(select jsonb_array_elements_text(config->'lembretes_dias')::int)
                else array[2, 0] end
      into v_dias from empresa where id = new.empresa_id;
    foreach v_dia in array coalesce(v_dias, array[2, 0]) loop
      v_quando := ((new.prazo - v_dia)::timestamp + time '09:00') at time zone 'America/Sao_Paulo';
      insert into lembrete (empresa_id, combinado_id, destinatario_user_id, canal, enviar_em)
      values (new.empresa_id, new.id, new.criado_por, 'inapp', greatest(v_quando, now()));
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists combinado_lembretes on combinado;
create trigger combinado_lembretes after insert or update on combinado
  for each row execute function combinado_gerar_lembretes();

-- Envio: marca como enviados os lembretes in-app que já venceram. E-mail entra quando houver
-- provedor configurado (N15); até lá, os lembretes de e-mail ficam na fila.
create or replace function enviar_lembretes_vencidos() returns int
language plpgsql security definer set search_path = public as $$
declare v_qtd int;
begin
  -- Só o agendador (sem usuário logado) dispara o envio.
  if auth.uid() is not null then
    raise exception 'envio de lembretes é feito só pelo agendador' using errcode = '42501';
  end if;
  update lembrete set enviado_em = now()
  where enviado_em is null and canal = 'inapp' and enviar_em <= now();
  get diagnostics v_qtd = row_count;
  return v_qtd;
end $$;
revoke execute on function enviar_lembretes_vencidos() from public, anon, authenticated;

-- Agendamento a cada 15 minutos (pg_cron existe no Supabase; no Postgres de teste local, não).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'copiloto-lembretes';
    perform cron.schedule('copiloto-lembretes', '*/15 * * * *', 'select public.enviar_lembretes_vencidos()');
  else
    raise notice 'pg_cron indisponível: lembretes não agendados neste banco';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Painel M8 · drill-down até o líder: só prazos e status, nunca a descrição nem ensaios.
-- ---------------------------------------------------------------------
create or replace function andamento_combinados_lider(p_lider uuid)
returns table (colaborador_nome text, prazo date, status status_combinado, vencido boolean)
language sql stable security definer set search_path = public as $$
  select c.nome, k.prazo, k.status, (k.status in ('aberto', 'renegociado') and k.prazo < current_date)
  from combinado k
  join colaborador l on l.id = k.lider_id
  left join colaborador c on c.id = k.colaborador_id
  where k.lider_id = p_lider
    and k.status in ('aberto', 'renegociado', 'cumprido', 'nao_cumprido')
    and (
      eh_admin(l.empresa_id)
      or exists (
        select 1 from membro m
        where m.user_id = auth.uid() and m.empresa_id = l.empresa_id and m.colaborador_id is not null
          and lidera(m.colaborador_id, p_lider)
      )
    )
  order by k.prazo nulls last;
$$;
