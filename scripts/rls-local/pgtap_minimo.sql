-- pgTAP mínimo para rodar os testes no PGlite (que não traz a extensão pgTAP).
-- Implementa só o subconjunto usado em supabase/tests/: plan, ok, throws_ok, lives_ok, finish.
-- A saída segue o formato TAP do pgTAP real. Usado apenas por scripts/testar-rls.mjs (modo local).
create schema if not exists tap;
grant usage on schema tap to public;

create table tap.resultado (n int primary key, passou boolean not null, descricao text);
create table tap.plano (total int not null);
grant select, insert on tap.resultado, tap.plano to public;

create function tap._registrar(passou boolean, descricao text, diagnostico text default null)
returns text language plpgsql as $$
declare v_n int; v_linha text;
begin
  select coalesce(max(n), 0) + 1 into v_n from tap.resultado;
  insert into tap.resultado values (v_n, passou, descricao);
  v_linha := case when passou then 'ok ' else 'not ok ' end || v_n || ' - ' || coalesce(descricao, '');
  if not passou and diagnostico is not null then v_linha := v_linha || E'\n# ' || diagnostico; end if;
  return v_linha;
end $$;

create function tap.plan(total int) returns text language sql as $$
  insert into tap.plano values (total); select '1..' || total;
$$;

create function tap.ok(condicao boolean, descricao text) returns text language sql as $$
  select tap._registrar(coalesce(condicao, false), descricao);
$$;

create function tap.throws_ok(comando text, codigo char(5), mensagem text, descricao text)
returns text language plpgsql as $$
begin
  execute comando;
  return tap._registrar(false, descricao, 'nenhum erro foi lançado; esperado ' || codigo);
exception when others then
  if (codigo is null or sqlstate = codigo) and (mensagem is null or sqlerrm = mensagem) then
    return tap._registrar(true, descricao);
  end if;
  return tap._registrar(false, descricao, 'erro ' || sqlstate || ': ' || sqlerrm || '; esperado ' || codigo);
end $$;

create function tap.lives_ok(comando text, descricao text) returns text language plpgsql as $$
begin
  execute comando;
  return tap._registrar(true, descricao);
exception when others then
  return tap._registrar(false, descricao, 'erro ' || sqlstate || ': ' || sqlerrm);
end $$;

create function tap.finish() returns setof text language plpgsql as $$
declare v_plano int; v_feitos int; v_falhas int;
begin
  select total into v_plano from tap.plano limit 1;
  select count(*), count(*) filter (where not passou) into v_feitos, v_falhas from tap.resultado;
  if v_plano is not null and v_plano <> v_feitos then
    return next '# Planejados ' || v_plano || ' testes, executados ' || v_feitos;
  end if;
  if v_falhas > 0 then return next '# Falharam ' || v_falhas || ' de ' || v_feitos || ' testes'; end if;
end $$;

grant execute on all functions in schema tap to public;
