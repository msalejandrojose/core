import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// Espejo del backoffice (MOB-19): reglas recomendadas de JS + TS + react-hooks
// + react-refresh (Vite). El type-check estricto lo hace `tsc` en el build.
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
    rules: {
      // Heurística de rendimiento de react-hooks v7 ("you might not need an
      // effect"). La app carga datos de la API dentro de efectos a propósito
      // (patrón establecido en los hooks de feature); no es un bug de
      // corrección. Mantenemos activas rules-of-hooks y exhaustive-deps.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Los tests y el setup usan APIs de Node/Vitest y no son componentes.
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
