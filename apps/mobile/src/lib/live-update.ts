import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

/**
 * Actualizaciones en caliente (ver `ota/README.md`). El plugin baja la web
 * nueva en segundo plano y la aplica la próxima vez que la app pasa a segundo
 * plano. Hay que decirle que esta versión arrancó bien: si no llega el aviso a
 * tiempo (`appReadyTimeout`), da la actualización por rota y vuelve a la
 * anterior en el siguiente arranque.
 */
export function notifyAppReady(): void {
  if (!Capacitor.isNativePlatform()) return;
  void CapacitorUpdater.notifyAppReady().catch(() => undefined);
}
