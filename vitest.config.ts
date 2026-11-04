import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['tests/**/*.test.ts', 'supabase/functions/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
