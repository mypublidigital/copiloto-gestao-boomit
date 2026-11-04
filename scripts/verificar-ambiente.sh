#!/usr/bin/env bash
# Confere ferramentas e variáveis de ambiente SEM exibir valores.
# Uso: bash scripts/verificar-ambiente.sh [sprint0|sprint1|sprint6|todas]   (padrão: sprint0)
set -uo pipefail
ETAPA=${1:-sprint0}
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="$RAIZ/.env.local"
FALTAS=0
ok()    { printf "  %-30s OK\n" "$1"; }
falta() { printf "  %-30s FALTA   %s\n" "$1" "$2"; FALTAS=$((FALTAS+1)); }

echo "Ferramentas"
if command -v node >/dev/null 2>&1; then
  V=$(node -v); MAJ=${V#v}; MAJ=${MAJ%%.*}
  if [ "$MAJ" -ge 20 ]; then ok "node $V"; else falta "node $V" "instale Node 20 ou superior (LTS)"; fi
else falta "node" "instale Node LTS (nodejs.org)"; fi
command -v npm >/dev/null 2>&1 && ok "npm" || falta "npm" "vem junto com o Node"
command -v git >/dev/null 2>&1 && ok "git" || falta "git" "instale o git"
if git -C "$RAIZ" remote get-url origin >/dev/null 2>&1; then ok "git remote origin"
else falta "git remote origin" "git remote add origin <url do repositório>"; fi

S0="SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_PASSWORD SUPABASE_ACCESS_TOKEN VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_MODO_DEMO ANTHROPIC_API_KEY MODELO_PRINCIPAL MODELO_RAPIDO MODELO_AVALIACAO BOOMIT_FONTE"
S1="BOOMIT_API_URL BOOMIT_API_TOKEN"
S6="EMAIL_API_KEY EMAIL_REMETENTE"
case "$ETAPA" in
  sprint0) VARS="$S0" ;;
  sprint1) VARS="$S0 $S1" ;;
  sprint6) VARS="$S0 $S1 $S6" ;;
  todas)   VARS="$S0 $S1 $S6" ;;
  *) echo "Etapa desconhecida: $ETAPA"; exit 2 ;;
esac

echo "Variáveis em .env.local (valores não são exibidos)"
if [ ! -f "$ENV_FILE" ]; then
  falta ".env.local" "cp .env.example .env.local e preencha"
else
  for VAR in $VARS; do
    VAL=$(grep -E "^${VAR}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//" -e 's/[[:space:]]//g')
    if [ -n "$VAL" ]; then ok "$VAR"; else falta "$VAR" "ver docs/necessidades.md"; fi
  done
fi

echo
if [ "$FALTAS" -eq 0 ]; then echo "Pronto para: $ETAPA"; else echo "$FALTAS item(ns) faltando para: $ETAPA"; fi
