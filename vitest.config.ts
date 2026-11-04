import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'supabase/functions/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
