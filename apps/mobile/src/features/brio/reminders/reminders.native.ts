import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { REMINDER_IDS, REST_END_ID, type ReminderSpec } from './reminders';

/**
 * Notificaciones locales: las programa el propio teléfono, sin servidor ni
 * cuenta de pago de Apple. En la web no hacen nada.
 */

const native = () => Capacitor.isNativePlatform();
const ALL_IDS = Object.values(REMINDER_IDS);

export type NotifPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

export async function notificationPermission(): Promise<NotifPermission> {
  if (!native()) return 'unavailable';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!native()) return 'unavailable';
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Sustituye los recordatorios programados por estos (los que ya no tocan se quitan). */
export async function syncReminders(specs: ReminderSpec[]): Promise<void> {
  if (!native() || (await notificationPermission()) !== 'granted') return;
  try {
    await LocalNotifications.cancel({ notifications: ALL_IDS.map((id) => ({ id })) });
    if (!specs.length) return;
    await LocalNotifications.schedule({
      notifications: specs.map((s) => ({
        id: s.id,
        title: s.title,
        body: s.body,
        schedule: { at: s.at, allowWhileIdle: true },
        extra: { kind: s.kind },
      })),
    });
  } catch {
    // Si el sistema no deja programar, la app sigue igual: son solo recordatorios.
  }
}

/** Aviso de fin de descanso del entreno en Brío (suena aunque la app esté en segundo plano). */
export async function scheduleRestEnd(at: Date, next: string | null): Promise<void> {
  if (!native() || (await notificationPermission()) !== 'granted') return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_END_ID }] });
    if (at.getTime() <= Date.now()) return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_END_ID,
          title: 'Descanso terminado',
          body: next ? `Siguiente: ${next}` : 'A por la siguiente serie.',
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    // Sin permiso o sin plugin: la barra de descanso de la pantalla sigue funcionando.
  }
}

export async function cancelRestEnd(): Promise<void> {
  if (!native()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_END_ID }] });
  } catch {
    // Nada que cancelar.
  }
}
