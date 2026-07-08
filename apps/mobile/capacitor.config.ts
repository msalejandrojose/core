import type { CapacitorConfig } from '@capacitor/cli';

// Config de Capacitor para los builds nativos (iOS/Android). `webDir` apunta al
// output de Vite. Las plataformas nativas se añaden con `pnpm cap:add:ios` /
// `pnpm cap:add:android` (requieren Xcode / Android SDK) — no se commitean aquí.
const config: CapacitorConfig = {
  appId: 'es.aj.core',
  appName: 'Core',
  webDir: 'dist',
};

export default config;
