-- Sprint 3: alçadas (leitura para membros, gestão só do admin) e ações de desenvolvimento.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

reset role;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), -- líder
  ('00000000-0000-0000-0000-0000000000b1'), -- outro líder
  ('00000000-0000-0000-0000-0000000000c1'); -- admin RH
insert into empresa (id, nome) values ('10000000-0000-0000-0000-000000000001', 'Empresa Piloto (fictícia)');
insert into colaborador (id, empresa_id, email, nome, nivel) values
  ('20000000-0000-0000-0000-0000000000a0','10000000-0000-0000-0000-000000000001','lid@exemplo.com','Líder','tatico'),
  ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','ana@exemplo.com','Ana','operacional'),
  ('20000000-0000-0000-0000-0000000000b0','10000000-0000-0000-0000-000000000001','out@exemplo.com','Outro','tatico'),
  ('20000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-000000000001','pedro@exemplo.com','Pedro','operacional');
insert into vinculo_lideranca (empresa_id, lider_id, liderado_id) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000b0','20000000-0000-0000-0000-0000000000b2');
insert into membro (user_id, empresa_id, papel, colaborador_id) values
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000b0'),
  ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','admin_empresa', null);
insert into alcada (empresa_id, nivel, pode_decidir) values ('10000000-0000-0000-0000-000000000001','tatico','Folgas de até 2 dias (fictício)');

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from alcada) = 1, 'Líder lê as alçadas da empresa');
select throws_ok(
  $$insert into alcada (empresa_id, nivel, pode_decidir) values ('10000000-0000-0000-0000-000000000001','tatico','Tudo')$$,
  '42501', null, 'Líder não cria alçada');
select lives_ok(
  $$insert into acao_desenvolvimento (empresa_id, colaborador_id, descricao, origem) values
    ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a2','Plano semanal','boomit_pdi')$$,
  'Líder registra ação de desenvolvimento para a própria equipe');
select throws_ok(
  $$insert into acao_desenvolvimento (empresa_id, colaborador_id, descricao) values
    ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000b2','Indevida')$$,
  '42501', null, 'Líder não registra ação para pessoa de outra equipe');

select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from acao_desenvolvimento) = 0, 'Outro líder não vê ações da equipe alheia');

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$update alcada set limites = 'Sem despesas' where nivel = 'tatico'$$, 'Admin RH mantém as alçadas');

reset role;
select * from finish();
rollback;
