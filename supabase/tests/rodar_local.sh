#!/usr/bin/env bash
# Roda a migration e o teste de RLS num Postgres 16 puro (sem Supabase CLI).
# Com Supabase CLI, prefira: supabase db reset && supabase test db
set -euo pipefail
DB=${DB:-copiloto_teste}
AQUI=$(cd "$(dirname "$0")" && pwd)
dropdb --if-exists "$DB" && createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$AQUI/_stub_supabase_local.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$AQUI/../migrations/0001_fundacao.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$AQUI/_grants_local.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$AQUI/rls_cenario_piloto.sql" 2>&1 | grep -E "OK |FALHOU|>>>"
