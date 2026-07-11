import { SocialLogin } from '@capgo/capacitor-social-login';

let initialized: Promise<void> | null = null;

/**
 * Inicializa `@capgo/capacitor-social-login` una única vez, leyendo los
 * client IDs/App ID de las env vars `VITE_*` (no son secretos, van en el
 * bundle). Se difiere hasta el primer intento de login social — el flujo
 * email/password no lo necesita.
 */
export function ensureSocialLoginInitialized(): Promise<void> {
  if (!initialized) {
    initialized = SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
        iOSClientId: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID,
      },
      facebook: {
        appId: import.meta.env.VITE_FACEBOOK_APP_ID ?? '',
        clientToken: import.meta.env.VITE_FACEBOOK_CLIENT_TOKEN ?? '',
      },
    });
  }
  return initialized;
}

/** El usuario cerró el diálogo nativo sin completar el login: no es un error a mostrar. */
export function isSocialLoginCancelled(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(message);
}
