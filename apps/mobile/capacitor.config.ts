import type { CapacitorConfig } from '@capacitor/cli';

// Config de Capacitor para los builds nativos (iOS/Android). `webDir` apunta al
// output de Vite. Las plataformas nativas se añaden con `pnpm cap:add:ios` /
// `pnpm cap:add:android` (requieren Xcode / Android SDK) — no se commitean aquí
// (ver .gitignore). El flujo completo está en NATIVE.md.
const config: CapacitorConfig = {
  appId: 'es.aj.core',
  appName: 'Core',
  webDir: 'dist',
  plugins: {
    // Splash de arranque. El color de fondo casa con `--ion-background-color`
    // (greige cálido). La variante oscura la generan los assets (splash-dark).
    // Se auto-oculta al cargar la web; sin spinner (norte estético minimalista).
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 600,
      backgroundColor: '#f0efec',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Push nativas (MOB-13): al recibir en primer plano, iOS muestra el banner
    // con estas opciones. El registro/handlers viven en features/notifications.
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // El estilo de la status bar (claro/oscuro) se ajusta en caliente desde
    // ThemeProvider según el tema; aquí solo evitamos que la web quede debajo.
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;
