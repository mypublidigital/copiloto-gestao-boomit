#!/usr/bin/env bash
# Gera os tipos TypeScript do banco remoto (Management API, HTTPS). Rodar via: npm run db:tipos
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase gen types typescript --remote="$SUPABASE_PROJECT_REF" --schema public > src/tipos/banco.ts.tmp
mv src/tipos/banco.ts.tmp src/tipos/banco.ts
echo "Tipos gerados em src/tipos/banco.ts"
