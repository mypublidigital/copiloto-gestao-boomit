import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Motor de IA compartilhado: não pode depender de Boomit, adaptadores nem do app.
const BLOQUEIOS_DO_MOTOR = {
  patterns: [
    { group: ['**/adaptadores/**', '**/adaptadores'], message: 'O motor não pode importar adaptadores (ver CLAUDE.md, "Motor compartilhado").' },
    { group: ['**/src/**', '@/*'], message: 'O motor não pode importar código do app.' },
    { group: ['*boomit*', '**/*boomit*/**'], message: 'O motor não pode conhecer a Boomit.' },
  ],
}

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '_entrada'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['supabase/functions/_shared/motor/**/*.ts', 'supabase/functions/_shared/prompts/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', BLOQUEIOS_DO_MOTOR] },
  },
)
