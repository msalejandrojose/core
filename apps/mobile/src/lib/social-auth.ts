import { Capacitor } from '@capacitor/core';
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
      // Sign in with Apple: en iOS es nativo y no necesita más configuración.
      // Solo se inicializa si está activado, para no romper Android ni la web.
      ...(Capacitor.getPlatform() === 'ios' && import.meta.env.VITE_APPLE_SIGN_IN === 'true' ? { apple: {} } : {}),
      facebook: {
        appId: import.meta.env.VITE_FACEBOOK_APP_ID ?? '',
        clientToken: import.meta.env.VITE_FACEBOOK_CLIENT_TOKEN ?? '',
      },
    });
  }
  return initialized;
}

/** Mensajes con los que los SDK (y la ventana de Google en la web) dicen «lo he cerrado». */
const CANCELLED = /cancel|popup closed|window was closed|access[_ ]denied/i;

/**
 * El usuario cerró el diálogo (nativo o la ventana de Google en la web) sin
 * completar el login: no es un error a mostrar. `@capgo/capacitor-social-login`
 * lo marca con `code: 'USER_CANCELLED'`, pero su mensaje en la web es
 * «Popup closed», sin «cancel»; por eso se miran los dos.
 */
export function isSocialLoginCancelled(err: unknown): boolean {
  if (err && typeof err === 'object' && (err as { code?: unknown }).code === 'USER_CANCELLED') return true;
  const message = err instanceof Error ? err.message : String(err);
  return CANCELLED.test(message);
}
