#!/usr/bin/env bash
# Executa um comando com as variáveis do .env.local carregadas, sem exibi-las.
# Uso: bash scripts/com-env.sh 'npx supabase link --project-ref "$SUPABASE_PROJECT_REF"'
# Use aspas simples em volta do comando para que $VARIAVEL seja expandida aqui dentro.
set -euo pipefail
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
if [ ! -f "$RAIZ/.env.local" ]; then
  echo "Falta .env.local. Rode: cp .env.example .env.local e preencha."; exit 1
fi
set -a; . "$RAIZ/.env.local"; set +a
cd "$RAIZ"
eval "$@"
