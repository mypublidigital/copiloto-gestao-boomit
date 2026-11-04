import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Variáveis do processo têm prioridade sobre o .env.local (mesma regra do Vite).
  const env = { ...loadEnv(mode, import.meta.dirname, 'VITE_'), ...process.env }
  const modoDemo = env.VITE_MODO_DEMO === 'true'
  const src = path.resolve(import.meta.dirname, 'src')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        // Fora do modo demonstração, nada de @/demo (personas, senha, seletor) entra no pacote.
        { find: /^@\/demo$/, replacement: path.join(src, modoDemo ? 'demo/index.tsx' : 'demo/vazio.ts') },
        { find: /^@\//, replacement: `${src}/` },
      ],
    },
  }
})
