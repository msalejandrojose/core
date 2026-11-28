/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Commit de la web que va dentro de la app (pie de Ajustes): así se ve qué OTA
// está corriendo. En GitHub Actions viene en GITHUB_SHA; en local, de git.
function webBuild(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

// Dev server en el puerto que `stack.config.json` reserva para mobile (4400).
export default defineConfig({
  define: {
    __BRIO_WEB_BUILD__: JSON.stringify(webBuild()),
  },
  plugins: [
    react(),
    // PWA instalable (MOB-15): Workbox precachea el app shell para arranque
    // offline, e inyecta el manifest + el registro del service worker.
    // `autoUpdate` refresca el SW en segundo plano al desplegar una versión nueva.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Brío',
        short_name: 'Brío',
        description: 'Actividad, plan de entreno y calorías en una sola app',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2F2F7',
        theme_color: '#F2F2F7',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // El paquete principal ronda los 2 MB: sin margen, el build falla al no poder cachearlo.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Precache del shell (JS/CSS/HTML/imagenes) para que la app abra sin red.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // Las llamadas a la API nunca se sirven del SW (datos siempre frescos).
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
      // En dev deja el SW desactivado por defecto para no cachear en caliente.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 4400,
    host: true,
  },
  test: {
    // jsdom para poder montar componentes React/Ionic y hooks con DOM.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.test.mjs'],
  },
});
