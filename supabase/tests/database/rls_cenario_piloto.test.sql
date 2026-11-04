-- =====================================================================
-- Teste de RLS (pgTAP) — cenário fictício de piloto (nomes e dados inventados)
-- Roda dentro de uma transação desfeita no final: não deixa dados no banco.
--   Local, sem Docker:   npm run test:rls          (PGlite + pgTAP mínimo)
--   Projeto remoto:      npm run test:rls:remoto   (pgTAP real do Supabase)
--   Com Docker:          npx supabase test db
--
-- Organograma fictício:
--   Diretor (u_dir)  └─ Líder (u_lid)  ├─ Ana   └─ João
--   Outro líder (u_out) sem relação com a equipe acima
--   Admin RH (u_rh) · Mentor Boomit (u_men) mentora o Líder
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(28);

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  execute 'set local role authenticated';
end $$;

-- ---------- seed (como superusuário / service role) ----------
reset role;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000d1'), -- diretor
  ('00000000-0000-0000-0000-0000000000a1'), -- líder
  ('00000000-0000-0000-0000-0000000000b1'), -- outro líder
  ('00000000-0000-0000-0000-0000000000c1'), -- admin RH
  ('00000000-0000-0000-0000-0000000000e1'); -- mentor

insert into empresa (id, nome) values ('10000000-0000-0000-0000-000000000001', 'Empresa Piloto (fictícia)');

insert into colaborador (id, empresa_id, email, nome, nivel) values
  ('20000000-0000-0000-0000-0000000000d0','10000000-0000-0000-0000-000000000001','dir@exemplo.com','Diretor','estrategico'),
  ('20000000-0000-0000-0000-0000000000a0','10000000-0000-0000-0000-000000000001','lid@exemplo.com','Líder','tatico'),
  ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','ana@exemplo.com','Ana','operacional'),
  ('20000000-0000-0000-0000-0000000000a3','10000000-0000-0000-0000-000000000001','joao@exemplo.com','João','operacional'),
  ('20000000-0000-0000-0000-0000000000b0','10000000-0000-0000-0000-000000000001','out@exemplo.com','Outro Líder','tatico'),
  ('20000000-0000-0000-0000-0000000000b2','10000000-0000-0000-0000-000000000001','pedro@exemplo.com','Pedro','operacional');

insert into vinculo_lideranca (empresa_id, lider_id, liderado_id) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000d0','20000000-0000-0000-0000-0000000000a0'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a3'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000b0','20000000-0000-0000-0000-0000000000b2');

insert into membro (user_id, empresa_id, papel, colaborador_id) values
  ('00000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000d0'),
  ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-000000000001','lider','20000000-0000-0000-0000-0000000000b0'),
  ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','admin_empresa', null),
  ('00000000-0000-0000-0000-0000000000e1','10000000-0000-0000-0000-000000000001','mentor', null);

insert into mentoria (empresa_id, mentor_user_id, lider_id) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000e1','20000000-0000-0000-0000-0000000000a0');

insert into contexto_colaborador_sensivel (colaborador_id, empresa_id, dados) values
  ('20000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','{"ppl": -4.1, "quadrante": "promessas"}');

-- ---------- 1. Visibilidade de pessoas ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from colaborador) = 3, 'Líder vê a si e aos 2 liderados');
select ok(not exists (select 1 from colaborador where nome = 'Pedro'), 'Líder não vê equipe de outro líder');

select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from colaborador) = 4, 'Diretor vê líder e liderados indiretos');

select pg_temp.como('00000000-0000-0000-0000-0000000000e1');
select ok((select count(*) from colaborador) = 3, 'Mentor vê o líder mentorado e a equipe dele');

select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok((select count(*) from colaborador) = 6, 'Admin RH vê todos os colaboradores');

-- ---------- 2. Situação = ensaio privado ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into situacao (id, empresa_id, lider_id, colaborador_id, tipo, frente, titulo, relato_inicial)
values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a2',
        'feedback','desempenho','Feedback de prazos','Duas entregas atrasaram (texto privado)');
insert into preparacao (situacao_id, empresa_id, versao, conteudo, gerado_por)
values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',1,'{"resumo":"privado"}','ia');
select ok((select count(*) from situacao) = 1, 'Líder lê a própria situação');

select throws_ok(
  $$insert into situacao (empresa_id, lider_id, colaborador_id, tipo, frente, titulo)
    values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0',
            '20000000-0000-0000-0000-0000000000b2','feedback','desempenho','Tentativa indevida')$$,
  '42501', null, 'Líder não cria situação sobre pessoa fora da equipe');

select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from situacao) = 0, 'Diretor NÃO lê ensaio do líder');
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok((select count(*) from situacao) = 0 and (select count(*) from preparacao) = 0, 'Admin RH NÃO lê ensaio nem preparação');
select pg_temp.como('00000000-0000-0000-0000-0000000000e1');
select ok((select count(*) from situacao) = 0, 'Mentor não lê antes de compartilhar');

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
update situacao set compartilhada_mentor = true where id = '30000000-0000-0000-0000-000000000001';
select pg_temp.como('00000000-0000-0000-0000-0000000000e1');
select ok((select count(*) from preparacao) = 1, 'Mentor lê depois que o líder compartilha');

-- ---------- 3. Auditoria não vaza conteúdo privado ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok(
  (select count(*) from auditoria where tabela = 'situacao') >= 1
  and not exists (select 1 from auditoria where tabela in ('situacao','preparacao')
                  and (coalesce(depois,'{}')::text like '%privado%' or coalesce(antes,'{}')::text like '%privado%')),
  'Auditoria de ensaio guarda só metadados');

-- ---------- 4. Registro direto ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into registro (empresa_id, colaborador_id, tipo, texto, visibilidade) values
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a2','reconhecimento','Conduziu bem a reunião com o cliente','linha_gestao'),
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a2','observacao','Nota pessoal do líder','privado');
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from registro) = 1, 'Diretor lê registro da linha de gestão, não o privado');
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from registro) = 0, 'Outro líder não lê registros da equipe alheia');

-- ---------- 5. Combinados ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into combinado (id, empresa_id, lider_id, colaborador_id, situacao_id, descricao, responsavel_tipo, prazo, origem)
values ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-0000000000a0','20000000-0000-0000-0000-0000000000a2',
        '30000000-0000-0000-0000-000000000001','Revisar prioridades da semana','colaborador', current_date - 1, 'preparacao');
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from combinado) = 0, 'Combinado em revisão não aparece para o diretor');
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
update combinado set status = 'aberto' where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok((select count(*) from combinado) = 1, 'Combinado confirmado aparece para o diretor');

-- ---------- 6. Painel da gestão superior ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok(
  (select count(*) from andamento_lideranca('10000000-0000-0000-0000-000000000001')) = 1
  and (select combinados_vencidos from andamento_lideranca('10000000-0000-0000-0000-000000000001')) = 1,
  'Diretor vê andamento do líder abaixo (1 combinado vencido)');
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from andamento_lideranca('10000000-0000-0000-0000-000000000001')) = 0,
  'Outro líder não vê andamento de líderes fora da sua linha');
select pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select ok((select count(*) from andamento_lideranca('10000000-0000-0000-0000-000000000001')) = 3,
  'Admin RH vê andamento de todos os líderes');
select pg_temp.como(null);
select ok((select count(*) from andamento_lideranca('10000000-0000-0000-0000-000000000001')) = 0,
  'Sem sessão: painel vazio');

-- ---------- 7. Indicadores sensíveis ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from contexto_colaborador_sensivel) = 0, 'Com a flag desligada, líder não vê PPL/R3');
reset role;
update empresa set config = config || '{"exibir_indicadores_sensiveis": true}' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select ok((select count(*) from contexto_colaborador_sensivel) = 1, 'Com a flag ligada, líder vê indicadores da sua equipe');
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select ok((select count(*) from contexto_colaborador_sensivel) = 0, 'Mesmo com a flag, outro líder não vê');

-- ---------- 8. Ensaio não vira aplicação ----------
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$update situacao set status = 'aplicada' where id = '30000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'Situação só fica "aplicada" com data da conversa real');

-- ---------- 9. Reunião exige aviso aos participantes ----------
select throws_ok(
  $$insert into documento_fonte (empresa_id, lider_id, tipo, titulo)
    values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','transcricao_reuniao','Reunião de equipe')$$,
  '23514', null, 'Reunião sem aviso aos participantes é recusada');
select lives_ok(
  $$insert into documento_fonte (empresa_id, lider_id, tipo, titulo, participantes_avisados)
    values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a0','transcricao_reuniao','Reunião de equipe', true)$$,
  'Reunião com aviso confirmado é aceita');

-- ---------- 10. Linha do tempo com natureza explícita ----------
insert into simulacao (situacao_id, empresa_id) values
  ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
select ok(
  exists (select 1 from linha_do_tempo where colaborador_id = '20000000-0000-0000-0000-0000000000a2' and natureza = 'ensaio')
  and exists (select 1 from linha_do_tempo where colaborador_id = '20000000-0000-0000-0000-0000000000a2' and natureza = 'relato_lider'),
  'Líder vê, rotulados, o próprio ensaio e o relato');
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select ok(
  not exists (select 1 from linha_do_tempo where natureza = 'ensaio')
  and exists (select 1 from linha_do_tempo where natureza = 'combinado')
  and (select count(*) from linha_do_tempo where natureza = 'relato_lider') = 1,
  'Diretor não vê ensaios; vê combinado e relato publicados');

reset role;
select * from finish();
rollback;
