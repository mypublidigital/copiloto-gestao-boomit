-- 0003 · Origem "mock" para execuções e snapshots do conector Boomit.
-- Com BOOMIT_FONTE=mock os dados vêm de fixtures/boomit/ (fictícios). Registrar essa origem
-- explicitamente evita confundir dado fictício com dado vindo da API da Boomit.
-- RLS: nenhuma tabela nova; conector_execucao e boomit_snapshot seguem legíveis só pelo admin
-- (teste em supabase/tests/database/conector.test.sql).
alter type fonte_snapshot add value if not exists 'mock';
