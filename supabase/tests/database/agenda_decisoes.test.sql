-- 0007: agenda da liderança, apoio à decisão, régua de e-mails e insights semanais.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

reset role;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000d1'), -- diretor
  ('00000000-0000-0000-0000-0000000000a1'), -- líder
  ('00000000-0000-0000-0000-0000000000b1'), -- outro líder
  ('00000000-0000-0000-0000-0000000000e1'); -- admin RH
insert into empresa (id, nome) values ('10000000-0000-0000-0000-000000000001', 'Empresa Piloto (fictícia)');
insert into colaborador (id, empresa_id, email, nome, nivel) values
  ('20000000-0000-0000-0000-0000000000d0','10000000-0000-0000-0000-000000000001','dir@exemplo.com','Diretor','estrategico'),
  ('20000000-0000-0000-0000-0000000000a0','10000000-0000-0000-0000-000000000001','lid@exemplo.com','Líder','tatico'),
  ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','ana@exemplo.com','Ana','operacional'),
  ('20000000-0000-0000-0000-0000000000b0','10000000-0000-0000-0000-000000000001','out@exemplo.com','Outro','tatico'),
  ('20000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-000000000001','bia@exemplo.com','Bia','operacional');
insert into vinculo_lideranca (empresa_id, lider_id, liderado_id) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000d0','20000000-0000-0000-0000-0000000000a0'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000b0','20000000-0000-0000-0000-0000000000b2');
insert into membro (user_id, empresa_id, papel, colaborador_id) values
  ('00000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000d0'),
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000b0'),
  ('00000000-0000-0000-0000-0000000000e1','10000000-0000-0000-0000-000000000001','admin_empresa',null);

-- Agenda --------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into compromisso (id, empresa_id, lider_id, colaborador_id, tipo, titulo, inicio) values
  ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0',
   '20000000-0000-0000-0000-0000000000a2','um_a_um','1:1 com Ana', now() + interval '3 days');
select ok(
  (select count(*) from lembrete where compromisso_id = '50000000-0000-0000-0000-000000000001') = 6
  and (select count(*) from lembrete where compromisso_id = '50000000-0000-0000-0000-000000000001' and canal = 'email') = 3,
  'Agendar gera a régua: confirmação, véspera, 1 hora antes e pós-evento (3 por e-mail)');

select throws_ok($$insert into compromisso (empresa_id, lider_id, colaborador_id, tipo, titulo, inicio) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000b2','feedback','Fora da equipe', now())$$,
  '42501', null, 'Líder não agenda com pessoa fora da sua equipe');

select throws_ok($$update compromisso set status = 'realizado' where id = '50000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Realizado exige a data em que aconteceu');

update compromisso set status = 'realizado', realizado_em = now(), relato = 'Conversamos sobre o plano'
where id = '50000000-0000-0000-0000-000000000001';
select ok(
  (select count(*) from lembrete where compromisso_id = '50000000-0000-0000-0000-000000000001' and enviado_em is null) = 0,
  'Compromisso realizado não deixa lembretes pendentes');

select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from compromisso) = 0, 'Outro líder não vê a agenda do líder');
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from compromisso) = 0, 'Diretor não vê a agenda privada do líder');
select pg_temp.como('00000000-0000-0000-0000-0000000000e1');
select ok((select count(*) from compromisso) = 0, 'Admin RH não vê a agenda privada do líder');

-- Decisões ------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into decisao (id, empresa_id, lider_id, titulo, pergunta, prazo_decisao) values
  ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0',
   'Escala de plantão', 'Como dividir o plantão de dezembro?', current_date + 5);
select ok((select count(*) from lembrete where decisao_id = '60000000-0000-0000-0000-000000000001') = 2,
  'Decisão com prazo gera lembrete na véspera (app e e-mail)');

select throws_ok($$update decisao set status = 'decidida' where id = '60000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Decisão só fica "decidida" com a opção escolhida e a data');

update decisao set status = 'decidida', opcao_escolhida = 'Rodízio semanal', decidida_em = now(), revisar_em = current_date + 30
where id = '60000000-0000-0000-0000-000000000001';
select ok(
  (select count(*) from lembrete where decisao_id = '60000000-0000-0000-0000-000000000001' and enviado_em is null) = 2
  and (select bool_and(etapa = 'decisao_revisao') from lembrete where decisao_id = '60000000-0000-0000-0000-000000000001' and enviado_em is null),
  'Decidida com data de revisão troca o lembrete de prazo pelo de revisão');

select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from decisao) = 0, 'Diretor não lê as decisões em análise do líder');

-- E-mails, insights e configuração ---------------------------------------
reset role;
insert into email_envio (empresa_id, destinatario_user_id, para, tipo, assunto, html, texto) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','lid@exemplo.com','lembrete','A','<p>a</p>','a'),
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','out@exemplo.com','lembrete','B','<p>b</p>','b');
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from email_envio) = 1 and (select para from email_envio) = 'lid@exemplo.com',
  'Cada um vê só a própria caixa de saída');
select throws_ok($$insert into email_envio (empresa_id, destinatario_user_id, para, tipo, assunto, html, texto) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','x@exemplo.com','lembrete','X','x','x')$$,
  '42501', null, 'Usuário não grava e-mails na fila (só as funções)');
select ok((select count(*) from config_sistema) = 0, 'Usuário não lê a configuração do sistema (segredo do agendador)');
select throws_ok($$select chamar_funcao('processar-envios')$$, '42501', null, 'Usuário não dispara o agendador');

reset role;
select * from finish();
rollback;
