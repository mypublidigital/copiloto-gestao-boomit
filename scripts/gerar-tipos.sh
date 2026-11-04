#!/usr/bin/env bash
# Gera os tipos TypeScript do banco remoto (Management API, HTTPS). Rodar via: npm run db:tipos
# Uma cópia vai para as Edge Functions, que não importam nada de src/.
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase gen types typescript --remote="$SUPABASE_PROJECT_REF" --schema public > src/tipos/banco.ts.tmp
mv src/tipos/banco.ts.tmp src/tipos/banco.ts
mkdir -p supabase/functions/_shared/tipos
cp src/tipos/banco.ts supabase/functions/_shared/tipos/banco.ts
echo "Tipos gerados em src/tipos/banco.ts e supabase/functions/_shared/tipos/banco.ts"
