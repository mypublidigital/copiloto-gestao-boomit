// Ponto de entrada do modo demonstração. Só entra no build com VITE_MODO_DEMO=true:
// nos outros builds, vite.config.ts troca '@/demo' por './vazio.ts'.
import type { ReactElement } from 'react'
import SeletorPersona from './SeletorPersona'

/** Bloco da tela de entrada com as personas fictícias. */
export function PersonasEntrada(): ReactElement | null {
  return (
    <section aria-labelledby="titulo-demo" className="flex flex-col gap-3">
      <h2 id="titulo-demo" className="font-semibold">
        Entrar como persona fictícia
      </h2>
      <SeletorPersona />
    </section>
  )
}

/** Troca rápida de persona no cabeçalho. */
export function PersonasCabecalho({ atual }: { atual: string | null }): ReactElement | null {
  return <SeletorPersona compacto atual={atual} />
}
