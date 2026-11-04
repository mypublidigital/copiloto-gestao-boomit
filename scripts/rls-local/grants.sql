-- Permissões equivalentes às do Supabase para o papel authenticated (somente teste local)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant select on auth.users to authenticated;
