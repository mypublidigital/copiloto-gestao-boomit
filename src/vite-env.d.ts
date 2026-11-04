/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_MODO_DEMO?: string
  readonly VITE_DEMO_SENHA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
