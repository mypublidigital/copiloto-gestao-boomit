// Chamadas às Edge Functions com o JWT do usuário logado.
import { supabase } from '@/lib/supabase'

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function cabecalhos(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre de novo.')
  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

/** POST JSON; erro da função vira Error com a mensagem dela. */
export async function chamarFuncao<T>(nome: string, corpo: unknown): Promise<T> {
  const resposta = await fetch(`${BASE}/${nome}`, { method: 'POST', headers: await cabecalhos(), body: JSON.stringify(corpo) })
  const json = (await resposta.json().catch(() => ({}))) as { erro?: string; message?: string }
  if (!resposta.ok) throw new Error(json.erro ?? json.message ?? `Falha ao chamar ${nome} (${resposta.status})`)
  return json as T
}

/** POST com resposta em SSE (`data: {...}` por evento). Chama `aoEvento` para cada um. */
export async function chamarFuncaoStream(nome: string, corpo: unknown, aoEvento: (evento: Record<string, unknown>) => void): Promise<void> {
  const resposta = await fetch(`${BASE}/${nome}`, { method: 'POST', headers: await cabecalhos(), body: JSON.stringify(corpo) })
  if (!resposta.ok || !resposta.body) {
    const json = (await resposta.json().catch(() => ({}))) as { erro?: string }
    throw new Error(json.erro ?? `Falha ao chamar ${nome} (${resposta.status})`)
  }
  const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await leitor.read()
    if (done) break
    buffer += value
    const eventos = buffer.split('\n\n')
    buffer = eventos.pop() ?? ''
    for (const bloco of eventos) {
      const linha = bloco.split('\n').find((l) => l.startsWith('data: '))
      if (linha) aoEvento(JSON.parse(linha.slice(6)) as Record<string, unknown>)
    }
  }
}
