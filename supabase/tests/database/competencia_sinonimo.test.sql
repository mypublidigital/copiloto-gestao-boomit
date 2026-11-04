-- Migration 0002 · competencia_sinonimo: leitura para qualquer usuário logado, escrita só via service role.
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

reset role;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1');

select ok((select count(*) from competencia_sinonimo) >= 30, 'Semente de sinônimos carregada (0002)');
select ok(
  (select competencia_canonica from competencia_sinonimo where chave_normalizada = 'comunicacao eficaz') = 'Comunicação',
  'Comunicacao_eficaz aponta para Comunicação');

select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select ok((select count(*) from competencia_sinonimo) >= 30, 'Usuário logado lê os sinônimos');
select throws_ok(
  $$insert into competencia_sinonimo (chave_normalizada, competencia_canonica) values ('teste', 'Teste')$$,
  '42501', null, 'Usuário logado não grava sinônimos');

reset role;
select * from finish();
rollback;
