import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { toast } from './toast';

/**
 * Avisos de las actualizaciones en caliente (OTA):
 * - al terminar de bajar una versión nueva: «Hay una versión nueva», con
 *   «Actualizar» para ponerla ya (si no, se pone sola al cerrar la app);
 * - al abrir la app con una versión que no había: «Brío se ha actualizado».
 * La versión es el commit de la web (`__BRIO_WEB_BUILD__`, el del pie de Ajustes).
 */

const SEEN_KEY = 'brio.web-build.seen';

export type UpdateNotice = { kind: 'none' } | { kind: 'updated'; from: string; to: string };

/** Qué decir al arrancar: nada la primera vez ni si es la misma versión. */
export function startupNotice(seen: string | null, current: string): UpdateNotice {
  if (!seen || !current || seen === current || current === 'dev') return { kind: 'none' };
  return { kind: 'updated', from: seen, to: current };
}

function read(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}
function write(value: string): void {
  try {
    localStorage.setItem(SEEN_KEY, value);
  } catch {
    /* sin almacenamiento: no se avisa, pero no rompe */
  }
}

let installed = false;

export function installOtaNotices(): void {
  if (installed || !Capacitor.isNativePlatform()) return;
  installed = true;

  const notice = startupNotice(read(), __BRIO_WEB_BUILD__);
  write(__BRIO_WEB_BUILD__);
  if (notice.kind === 'updated') {
    // Un momento después de arrancar, cuando la isla de avisos ya está montada.
    window.setTimeout(() => {
      toast.success('Brío se ha actualizado', `Ya tienes la última versión (web ${notice.to}).`, { icon: 'spark', duration: 5000 });
    }, 1200);
  }

  void CapacitorUpdater.addListener('updaterEvent', (event) => {
    if (event.type !== 'downloadComplete') return;
    const { id } = event.data.bundle;
    toast.info('Hay una versión nueva de Brío', 'Se pone sola al cerrar la app, o actualiza ahora.', {
      icon: 'sync',
      duration: 10000,
      action: {
        label: 'Actualizar',
        // Recarga la app con la versión nueva; al arrancar sale «Brío se ha actualizado».
        run: async () => {
          try {
            await CapacitorUpdater.set({ id });
          } catch {
            toast.error('No se pudo actualizar', 'Se pondrá al cerrar la app.');
          }
        },
      },
    });
  }).catch(() => undefined);
}
