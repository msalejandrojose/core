import type { CapacitorConfig } from '@capacitor/cli';
import { loadEnv } from 'vite';

// Si el build apunta a una API por `http` (un backend de pruebas en la red local
// o ZeroTier), Android necesita servir la app por `http` y permitir tráfico sin
// cifrar; si no, el WebView bloquea las llamadas. Contra una API `https` se
// mantienen los valores seguros por defecto.
const env = loadEnv('production', __dirname, ['VITE_', 'CAP_']);
const apiUrl = env.VITE_API_URL ?? '';
const httpApi = apiUrl.startsWith('http://');

// Modo «app conectada al Mac» (solo para probar): con CAP_SERVER_URL en
// `.env.production.local` (no se commitea), la app nativa no lleva la web dentro
// y la carga de esa URL, p. ej. el Vite del Mac por ZeroTier. Así los cambios de
// web llegan al iPhone sin reinstalar, estés donde estés. Sin la variable, el
// build es el normal. Ver NATIVE.md.
const devServerUrl = env.CAP_SERVER_URL?.trim() || '';

// Config de Capacitor para los builds nativos (iOS/Android). `webDir` apunta al
// output de Vite. Las plataformas nativas se añaden con `pnpm cap:add:ios` /
// `pnpm cap:add:android` (requieren Xcode / Android SDK) — no se commitean aquí
// (ver .gitignore). El flujo completo está en NATIVE.md.
const config: CapacitorConfig = {
  appId: 'es.aj.brio',
  appName: 'Brío',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        // Si el Vite del Mac no responde (apagado, sin ZeroTier), el WebView
        // se quedaba en blanco: esta página local dice qué pasa.
        server: { url: devServerUrl, cleartext: true, errorPath: 'dev-server-offline.html' },
      }
    : httpApi
      ? { server: { androidScheme: 'http', cleartext: true } }
      : {}),
  // Fondo de la vista nativa: lo que asoma detrás del teclado (que es
  // translúcido) y al rebotar. Sin él, iOS pinta negro. Es el --brio-bg.
  backgroundColor: '#f2f2f7',
  plugins: {
    // Teclado claro siempre (la app es clara) y la web se encoge para dejarle
    // sitio; el campo del coach se pega encima (ver dock/keyboard.ts).
    Keyboard: {
      resize: 'native',
      style: 'LIGHT',
      resizeOnFullScreen: true,
    },
    // Splash de arranque. El color de fondo casa con `--ion-background-color`
    // (gris claro del DS de Brío). La variante oscura la generan los assets (splash-dark).
    // Se auto-oculta al cargar la web; sin spinner (norte estético minimalista).
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 600,
      backgroundColor: '#f2f2f7',
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
    // Pantalla completa: la web se pinta también bajo la status bar y la isla
    // (si no, iOS deja esa franja en negro). Las pantallas ya reservan el hueco
    // con `env(safe-area-inset-top)`. El estilo (texto claro/oscuro) se ajusta
    // en caliente desde ThemeProvider según el tema.
    StatusBar: {
      overlaysWebView: true,
    },
  },
};

export default config;
