/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Dev server en el puerto que `stack.config.json` reserva para mobile (4400).
export default defineConfig({
  plugins: [
    react(),
    // PWA instalable (MOB-15): Workbox precachea el app shell para arranque
    // offline, e inyecta el manifest + el registro del service worker.
    // `autoUpdate` refresca el SW en segundo plano al desplegar una versión nueva.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Core',
        short_name: 'Core',
        description: 'App móvil de Core',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F0EFEC',
        theme_color: '#F0EFEC',
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
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
