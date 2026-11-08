#!/usr/bin/env node
// Grava em config_sistema os endereços que o agendador e os e-mails usam (nada fixo no código):
//   url_funcoes = <SUPABASE_URL>/functions/v1   (pg_cron → processar-envios e insights-semanais)
//   url_app     = APP_URL (links dos e-mails); padrão: o endereço da demonstração na Vercel.
// Uso: npm run db:agendador
import { sqlRemoto } from './sql-remoto.mjs'

const { SUPABASE_URL, APP_URL } = process.env
if (!SUPABASE_URL) throw new Error('Falta SUPABASE_URL no .env.local')
const app = (APP_URL || 'https://copiloto-gestao-boomit-demo.vercel.app').replace(/\/$/, '')
const lit = (s) => `'${s.replace(/'/g, "''")}'`
await sqlRemoto(`insert into config_sistema (chave, valor) values
  ('url_funcoes', ${lit(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1`)}),
  ('url_app', ${lit(app)})
on conflict (chave) do update set valor = excluded.valor;`)
console.log(`Agendador configurado. Links dos e-mails apontam para ${app}`)
