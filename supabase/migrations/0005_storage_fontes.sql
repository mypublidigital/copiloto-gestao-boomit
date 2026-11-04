-- 0005 · Sprint 4: bucket privado de fontes (reuniões, mentorias, documentos).
-- Caminho obrigatório: {empresa_id}/{documento_id}/{arquivo} (CLAUDE.md, Regras de dados).
-- O arquivo segue a mesma regra do documento_fonte: grava quem enviou o documento; lê quem pode
-- ver o documento (pode_ver_documento). Download só por URL assinada de curta duração.
-- Teste em supabase/tests/database/fontes.test.sql.

insert into storage.buckets (id, name, public)
values ('fontes', 'fontes', false)
on conflict (id) do update set public = false;

-- Documento dono do caminho: segunda pasta do caminho.
create or replace function documento_do_caminho(p_nome text)
returns uuid language sql immutable as $$
  select case
    when (storage.foldername(p_nome))[2] ~ '^[0-9a-f-]{36}$' then ((storage.foldername(p_nome))[2])::uuid
  end;
$$;

create policy fontes_enviar on storage.objects for insert to authenticated with check (
  bucket_id = 'fontes'
  and exists (
    select 1 from documento_fonte d
    where d.id = documento_do_caminho(name)
      and d.enviado_por = auth.uid()
      and d.empresa_id::text = (storage.foldername(name))[1]
  )
);

create policy fontes_ler on storage.objects for select to authenticated using (
  bucket_id = 'fontes' and pode_ver_documento(documento_do_caminho(name))
);
