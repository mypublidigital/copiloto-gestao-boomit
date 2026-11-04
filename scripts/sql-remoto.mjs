// Executa SQL no projeto Supabase remoto pela Management API (HTTPS, porta 443).
// Alternativa ao `supabase db push` quando a rede bloqueia a porta do Postgres (5432/6543).
// Precisa de SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN (carregados por scripts/com-env.sh).
// A API devolve só o resultado do último comando do script.

export async function sqlRemoto(query) {
  const { SUPABASE_PROJECT_REF: ref, SUPABASE_ACCESS_TOKEN: token } = process.env
  if (!ref || !token) throw new Error('Faltam SUPABASE_PROJECT_REF ou SUPABASE_ACCESS_TOKEN no .env.local')
  const resposta = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const texto = await resposta.text()
  if (!resposta.ok) {
    let mensagem = texto
    try {
      mensagem = JSON.parse(texto).message ?? texto
    } catch {
      // resposta não é JSON: usa o texto puro
    }
    const erro = new Error(mensagem)
    erro.status = resposta.status
    throw erro
  }
  return texto ? JSON.parse(texto) : []
}
