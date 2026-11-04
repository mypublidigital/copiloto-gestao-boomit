-- interacao_ia: metadados das chamadas de IA. Cada um lê as suas; o admin lê as da empresa.
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
  ('00000000-0000-0000-0000-0000000000a1'), -- líder
  ('00000000-0000-0000-0000-0000000000b1'), -- outro líder
  ('00000000-0000-0000-0000-0000000000c1'); -- admin RH
insert into empresa (id, nome) values ('10000000-0000-0000-0000-000000000001', 'Empresa Piloto (fictícia)');
insert into membro (user_id, empresa_id, papel) values
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','lider'),
  ('00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-000000000001','lider'),
  ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','admin_empresa');

select ok(exists (select 1 from information_schema.columns where table_name = 'interacao_ia' and column_name = 'versao_prompt'),
  'interacao_ia tem versao_prompt (0004)');

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$insert into interacao_ia (empresa_id, finalidade, modelo, versao_prompt, fontes_ids, tokens_entrada, tokens_saida)
    values ('10000000-0000-0000-0000-000000000001','preparacao','modelo-x','preparacao-feedback@1','{f1}',100,20)$$,
  'Líder registra a própria chamada de IA');
select ok((select count(*) from interacao_ia) = 1, 'Líder lê a própria chamada');

select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from interacao_ia) = 0, 'Outro líder não lê chamadas alheias');

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok((select count(*) from interacao_ia) = 1, 'Admin lê os metadados de uso da empresa');

reset role;
select * from finish();
rollback;
