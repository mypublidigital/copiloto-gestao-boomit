-- 0004 · Versão do prompt em interacao_ia (CLAUDE.md, Convenções: "prompts versionados …
-- com VERSAO exportada e registrada em interacao_ia"). Só metadado; o conteúdo nunca é gravado.
-- RLS: inalterada (ia_ler / ia_criar / ia_avaliar da 0001); caso em
-- supabase/tests/database/interacao_ia.test.sql.
alter table interacao_ia add column if not exists versao_prompt text;
