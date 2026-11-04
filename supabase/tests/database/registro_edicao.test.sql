-- Sprint 2 · M5: edição de registro só pelo autor, com auditoria do antes e depois.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

reset role;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), -- líder (autor)
  ('00000000-0000-0000-0000-0000000000d1'), -- diretor
  ('00000000-0000-0000-0000-0000000000c1'); -- admin RH
insert into empresa (id, nome) values ('10000000-0000-0000-0000-000000000001', 'Empresa Piloto (fictícia)');
insert into colaborador (id, empresa_id, email, nome, nivel) values
  ('20000000-0000-0000-0000-0000000000d0','10000000-0000-0000-0000-000000000001','dir@exemplo.com','Diretor','estrategico'),
  ('20000000-0000-0000-0000-0000000000a0','10000000-0000-0000-0000-000000000001','lid@exemplo.com','Líder','tatico'),
  ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','ana@exemplo.com','Ana','operacional');
insert into vinculo_lideranca (empresa_id, lider_id, liderado_id) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000d0','20000000-0000-0000-0000-0000000000a0'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a2');
insert into membro (user_id, empresa_id, papel, colaborador_id) values
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000d0'),
  ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','admin_empresa', null);

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into registro (id, empresa_id, colaborador_id, tipo, texto, visibilidade) values
  ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a2','feedback','Texto original','linha_gestao');
update registro set texto = 'Texto corrigido', tipo = 'reconhecimento' where id = '60000000-0000-0000-0000-000000000001';
select ok((select texto from registro where id = '60000000-0000-0000-0000-000000000001') = 'Texto corrigido', 'Autor edita o próprio registro');

-- O diretor lê o registro (linha de gestão), mas a edição dele não altera nada.
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
update registro set texto = 'Edição indevida' where id = '60000000-0000-0000-0000-000000000001';
select ok((select texto from registro where id = '60000000-0000-0000-0000-000000000001') = 'Texto corrigido', 'Diretor não edita registro de outro líder');

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok(
  exists (select 1 from auditoria where tabela = 'registro' and acao = 'UPDATE'
          and antes->>'texto' = 'Texto original' and depois->>'texto' = 'Texto corrigido'),
  'Auditoria guarda antes e depois da edição (registro da linha de gestão)');

-- Ao tornar privado, a auditoria passa a guardar só metadados.
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
update registro set visibilidade = 'privado', texto = 'Nota privada' where id = '60000000-0000-0000-0000-000000000001';
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok(not exists (select 1 from auditoria where tabela = 'registro' and coalesce(depois, '{}')::text like '%Nota privada%'),
  'Registro privado: auditoria não guarda o texto');
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok(not exists (select 1 from registro where id = '60000000-0000-0000-0000-000000000001'), 'Registro que virou privado some para o diretor');

reset role;
select * from finish();
rollback;
