import { useEffect, useState, type DependencyList } from 'react'

export type Consulta<T> = { estado: 'carregando' } | { estado: 'erro'; mensagem: string } | { estado: 'pronto'; dados: T }

/** Executa uma consulta assíncrona e acompanha carregando/erro/pronto. Refaz quando `deps` muda. */
export function useConsulta<T>(executar: () => Promise<T>, deps: DependencyList): Consulta<T> {
  const chave = JSON.stringify(deps)
  const [resultado, setResultado] = useState<{ chave: string; consulta: Consulta<T> } | null>(null)
  useEffect(() => {
    let ativo = true
    executar().then(
      (dados) => ativo && setResultado({ chave, consulta: { estado: 'pronto', dados } }),
      (erro: unknown) => ativo && setResultado({ chave, consulta: { estado: 'erro', mensagem: erro instanceof Error ? erro.message : String(erro) } }),
    )
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
  // Enquanto o resultado é de outra chave (deps antigas), a consulta atual está carregando.
  return resultado?.chave === chave ? resultado.consulta : { estado: 'carregando' }
}

/** Lança o erro do Supabase, para a consulta cair no estado "erro". */
export function exigir<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  if (r.data === null) throw new Error('Sem dados')
  return r.data
}
