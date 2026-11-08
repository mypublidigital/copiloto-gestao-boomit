-- Sprint 6: lembretes automáticos, histórico de renegociação e drill-down do painel.
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

reset role;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000d1'), -- diretor
  ('00000000-0000-0000-0000-0000000000a1'), -- líder
  ('00000000-0000-0000-0000-0000000000b1'); -- outro líder
insert into empresa (id, nome) values ('10000000-0000-0000-0000-000000000001', 'Empresa Piloto (fictícia)');
insert into colaborador (id, empresa_id, email, nome, nivel) values
  ('20000000-0000-0000-0000-0000000000d0','10000000-0000-0000-0000-000000000001','dir@exemplo.com','Diretor','estrategico'),
  ('20000000-0000-0000-0000-0000000000a0','10000000-0000-0000-0000-000000000001','lid@exemplo.com','Líder','tatico'),
  ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','ana@exemplo.com','Ana','operacional'),
  ('20000000-0000-0000-0000-0000000000b0','10000000-0000-0000-0000-000000000001','out@exemplo.com','Outro','tatico');
insert into vinculo_lideranca (empresa_id, lider_id, liderado_id) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000d0','20000000-0000-0000-0000-0000000000a0'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a2');
insert into membro (user_id, empresa_id, papel, colaborador_id) values
  ('00000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000d0'),
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000b0');

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into combinado (id, empresa_id, lider_id, colaborador_id, descricao, responsavel_tipo, prazo, status, origem) values
  ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0',
   '20000000-0000-0000-0000-0000000000a2','Plano semanal (texto do combinado)','colaborador', current_date + 5, 'aberto', 'manual');
select ok((select count(*) from lembrete where combinado_id = '40000000-0000-0000-0000-000000000001' and enviado_em is null) = 6,
  'Combinado aberto com prazo gera D-2, D0 e vencido, no app e por e-mail');

select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from lembrete) = 0, 'Outro líder não vê lembretes do líder');

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
update combinado set status = 'renegociado', prazo = current_date + 10, nota_mudanca = 'Cliente pediu mais prazo'
where id = '40000000-0000-0000-0000-000000000001';
select ok(
  (select historico->0->>'nota' = 'Cliente pediu mais prazo' and (historico->0->>'prazo_de')::date = current_date + 5
     and (historico->0->>'prazo_para')::date = current_date + 10 from combinado where id = '40000000-0000-0000-0000-000000000001'),
  'Renegociação preserva prazo anterior e motivo no histórico');
select ok((select nota_mudanca is null from combinado where id = '40000000-0000-0000-0000-000000000001'), 'A nota vai para o histórico e não fica solta');
select ok(
  (select count(*) from lembrete where combinado_id = '40000000-0000-0000-0000-000000000001' and enviado_em is null
     and (enviar_em at time zone 'America/Sao_Paulo')::date in (current_date + 8, current_date + 10)) = 4,
  'Lembretes recriados para o novo prazo');

update combinado set status = 'cumprido', concluido_em = current_date, evidencia_registrada = 'Planos enviados'
where id = '40000000-0000-0000-0000-000000000001';
select ok((select count(*) from lembrete where combinado_id = '40000000-0000-0000-0000-000000000001' and enviado_em is null) = 0,
  'Combinado cumprido não deixa lembretes pendentes');
select ok((select jsonb_array_length(historico) from combinado where id = '40000000-0000-0000-0000-000000000001') = 2, 'Histórico registra cada mudança');

-- Vence hoje: o lembrete D0 já está na hora e o envio automático marca como enviado.
insert into combinado (id, empresa_id, lider_id, colaborador_id, descricao, responsavel_tipo, prazo, status, origem) values
  ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0',
   '20000000-0000-0000-0000-0000000000a2','Vence hoje','lider', current_date - 3, 'aberto', 'manual');
select throws_ok($$select enviar_lembretes_vencidos()$$, '42501', null, 'Usuário comum não dispara o envio de lembretes');
-- Como o agendador: sem papel de usuário e sem usuário no JWT.
reset role;
select set_config('request.jwt.claim.sub', '', true);
select ok(enviar_lembretes_vencidos() >= 1, 'Envio automático marca os lembretes vencidos');

select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok(
  (select count(*) from andamento_combinados_lider('20000000-0000-0000-0000-0000000000a0')) = 2
  and (select bool_or(vencido) from andamento_combinados_lider('20000000-0000-0000-0000-0000000000a0')),
  'Diretor vê prazos e status dos combinados do líder (com vencido)');
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from andamento_combinados_lider('20000000-0000-0000-0000-0000000000a0')) = 0, 'Outro líder não vê o drill-down');

reset role;
select * from finish();
rollback;
