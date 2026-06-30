// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  site: process.env.PUBLIC_SITE_URL || 'https://aj.es',
  integrations: [
    react(),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  // i18n preparado: es (default) + en. Activar routing cuando haya contenido real.
  // i18n: {
  //   defaultLocale: 'es',
  //   locales: ['es', 'en'],
  //   routing: { prefixDefaultLocale: false },
  // },
});
