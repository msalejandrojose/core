import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
    // Componentes shadcn/ui (exportan variantes cva junto al componente) y los
    // ficheros de columnas (exportan el array `columns` + el componente de
    // acciones de fila): patrón intencional, no afecta a fast-refresh en build.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/**/*columns.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // TanStack Table expone funciones que el plugin marca como incompatibles
    // con memoización; es un falso positivo para su API.
    files: ['src/components/data-table/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
])
