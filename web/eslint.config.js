import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn primitives export small helper functions/variants alongside
    // their components; TanStack Router file routes export a `Route`
    // object alongside the page component. Neither breaks fast refresh in
    // practice, both are the framework/library's own convention.
    files: ['src/components/ui/**/*.tsx', 'src/routes/**/*.tsx', 'src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
