import { Capacitor, registerPlugin } from '@capacitor/core';
import type { WidgetSnapshot } from './widget-snapshot';

/** Plugin propio (native/ios/App/BrioWidgetsPlugin.swift). Solo en iOS. */
interface BrioWidgetsPlugin {
  /** Guarda la instantánea en el App Group y recarga los widgets. */
  update(o: { snapshot: WidgetSnapshot }): Promise<void>;
  /** Borra los datos (al cerrar sesión): los widgets piden abrir la app. */
  clear(): Promise<void>;
}

const plugin = registerPlugin<BrioWidgetsPlugin>('BrioWidgets');

/** Hay widgets si es la app de iOS y el plugin está (builds viejos no lo traen). */
const supported = () => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('BrioWidgets');

let last = '';

/** Manda la instantánea a los widgets si ha cambiado (ignora la hora de actualización). */
export function pushWidgetSnapshot(snapshot: WidgetSnapshot): void {
  if (!supported()) return;
  const key = JSON.stringify({ ...snapshot, updatedAt: 0 });
  if (key === last) return;
  last = key;
  void plugin.update({ snapshot }).catch(() => {
    last = '';
  });
}

export function clearWidgets(): void {
  last = '';
  if (supported()) void plugin.clear().catch(() => undefined);
}
