import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications';
import { apiClient } from '@/api/client';

export interface PushHandlers {
  /** Notificación recibida con la app en primer plano. */
  onReceived?: (notification: PushNotificationSchema) => void;
  /** El usuario tocó la notificación (app en background/cerrada). */
  onAction?: (
    deepLink: string | undefined,
    notification: PushNotificationSchema,
  ) => void;
}

/**
 * Registra el token del dispositivo contra la API (best-effort). El endpoint de
 * registro de dispositivos todavía no existe en el backend (tarea pendiente:
 * modelo Device + `POST /me/devices`); mientras tanto la llamada falla en
 * silencio para no romper la app. El schema OpenAPI tampoco lo tipa aún, de ahí
 * el acceso con cast puntual.
 */
async function registerDeviceToken(token: string): Promise<void> {
  try {
    await (
      apiClient as unknown as {
        POST: (path: string, opts: { body: unknown }) => Promise<unknown>;
      }
    ).POST('/me/devices', {
      body: { token, platform: Capacitor.getPlatform() },
    });
  } catch {
    // Sin registro no hay push dirigido, pero la app sigue funcionando.
  }
}

/**
 * Inicializa las notificaciones push nativas (Capacitor). Es no-op fuera de un
 * dispositivo (web/PWA), donde el plugin no está implementado. Pide permiso,
 * registra el dispositivo contra la API y engancha los listeners de recepción en
 * primer plano y de tap (deep-link). Devuelve una función de limpieza que quita
 * los listeners.
 */
export async function registerPush(
  handlers: PushHandlers = {},
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  const current = await PushNotifications.checkPermissions();
  let receive = current.receive;
  if (receive === 'prompt' || receive === 'prompt-with-rationale') {
    receive = (await PushNotifications.requestPermissions()).receive;
  }
  if (receive !== 'granted') return () => {};

  const handles = [
    await PushNotifications.addListener('registration', (token: Token) => {
      void registerDeviceToken(token.value);
    }),
    await PushNotifications.addListener('registrationError', () => {
      // Silencioso: sin token no hay push, pero la app sigue.
    }),
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        handlers.onReceived?.(notification);
      },
    ),
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        const data = action.notification.data as
          | { deepLink?: string }
          | undefined;
        handlers.onAction?.(data?.deepLink, action.notification);
      },
    ),
  ];

  await PushNotifications.register();

  return () => {
    handles.forEach((handle) => void handle.remove());
  };
}
