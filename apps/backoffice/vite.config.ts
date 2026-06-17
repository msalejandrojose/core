import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// Scaffold inicial. Phase 2 añade Tailwind v4 plugin y shadcn (ver BO-01 / TASK-42).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
