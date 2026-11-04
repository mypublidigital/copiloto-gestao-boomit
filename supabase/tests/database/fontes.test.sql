-- Sprint 4 · Fontes e reuniões: arquivo no storage, trechos e extrações seguem o documento.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

reset role;
insert into storage.buckets (id, name, public) values ('fontes', 'fontes', false) on conflict (id) do nothing;
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
insert into documento_fonte (id, empresa_id, lider_id, tipo, titulo, participantes_avisados)
values ('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','anotacao_reuniao','1:1 com Ana', true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('fontes', '10000000-0000-0000-0000-000000000001/70000000-0000-0000-0000-000000000001/notas.md')$$,
  'Líder grava o arquivo no caminho do próprio documento');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('fontes', '10000000-0000-0000-0000-000000000001/70000000-0000-0000-0000-000000000099/x.md')$$,
  '42501', null, 'Caminho de documento inexistente ou alheio é recusado');
select ok((select count(*) from storage.objects where bucket_id = 'fontes') = 1, 'Líder lê o próprio arquivo');

-- Processamento (service role) grava trechos e extrações.
reset role;
insert into trecho (id, documento_id, empresa_id, ordem, texto)
values ('71000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',1,'[Ana] Enviar o plano semanal toda segunda.');
insert into extracao (id, documento_id, empresa_id, trecho_id, tipo, conteudo, confianca)
values ('72000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',
        '71000000-0000-0000-0000-000000000001','combinado','{"descricao":"Enviar o plano semanal"}',0.9);

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from trecho) = 1 and (select count(*) from extracao) = 1, 'Líder vê trechos e extrações do próprio documento');
update extracao set status_revisao = 'aprovado' where id = '72000000-0000-0000-0000-000000000001';
select ok((select status_revisao from extracao where id = '72000000-0000-0000-0000-000000000001') = 'aprovado', 'Líder revisa a extração');

select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from storage.objects where bucket_id = 'fontes') = 0 and (select count(*) from trecho) = 0,
  'Outro líder não lê o arquivo nem os trechos');

select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from documento_fonte) = 0 and (select count(*) from storage.objects where bucket_id = 'fontes') = 0,
  'Diretor não vê a reunião do líder (só o que vira combinado)');

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$insert into documento_fonte (empresa_id, lider_id, tipo, titulo) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','transcricao_mentoria','Mentoria sem aviso')$$,
  '23514', null, 'Mentoria sem aviso aos participantes é recusada');

reset role;
select * from finish();
rollback;
