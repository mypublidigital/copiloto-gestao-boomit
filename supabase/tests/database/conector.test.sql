-- Conector Boomit: execuções e snapshot bruto só para o admin; contexto da empresa para membros.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

reset role;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), -- líder
  ('00000000-0000-0000-0000-0000000000c1'), -- admin RH
  ('00000000-0000-0000-0000-0000000000f9'); -- usuário de outra empresa
insert into empresa (id, nome) values
  ('10000000-0000-0000-0000-000000000001', 'Empresa Piloto (fictícia)'),
  ('10000000-0000-0000-0000-000000000002', 'Outra Empresa (fictícia)');
insert into colaborador (id, empresa_id, email, nome, nivel) values
  ('20000000-0000-0000-0000-0000000000a0','10000000-0000-0000-0000-000000000001','lid@exemplo.com','Líder','tatico');
insert into membro (user_id, empresa_id, papel, colaborador_id) values
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','admin_empresa', null),
  ('00000000-0000-0000-0000-0000000000f9','10000000-0000-0000-0000-000000000002','admin_empresa', null);

select ok('mock' = any (enum_range(null::fonte_snapshot)::text[]), 'Origem mock existe no tipo fonte_snapshot (0003)');

insert into conector_execucao (id, empresa_id, fonte, status)
values ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','mock','sucesso');
insert into boomit_snapshot (empresa_id, execucao_id, entidade, entidade_id, schema_version, fonte, payload, hash)
values ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','empresa',
        '70000000-0000-0000-0000-000000000001','1.0','mock','{"nome_fantasia":"x"}','h1');
insert into contexto_empresa (empresa_id, dados) values ('10000000-0000-0000-0000-000000000001', '{"nome":"x"}');

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from conector_execucao) = 0, 'Líder não vê execuções do conector');
select ok((select count(*) from boomit_snapshot) = 0, 'Líder não vê o payload bruto da Boomit');
select ok((select count(*) from contexto_empresa) = 1, 'Líder vê o contexto normalizado da própria empresa');

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok((select count(*) from conector_execucao) = 1 and (select count(*) from boomit_snapshot) = 1,
  'Admin RH vê execuções e snapshot da própria empresa');

select pg_temp.como('00000000-0000-0000-0000-0000000000f9');
select ok((select count(*) from conector_execucao) = 0 and (select count(*) from contexto_empresa) = 0,
  'Admin de outra empresa não vê nada desta');

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$insert into conector_execucao (empresa_id, fonte) values ('10000000-0000-0000-0000-000000000001','mock')$$,
  '42501', null, 'Nem o admin grava execução pelo app (só o conector, via service role)');

reset role;
select * from finish();
rollback;
