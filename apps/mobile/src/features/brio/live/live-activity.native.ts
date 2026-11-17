import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { ActivityState } from './live-activity';

/** Plugin propio (native/ios/App/BrioLiveActivityPlugin.swift). Solo en iOS. */
interface BrioLiveActivityPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  start(o: { state: ActivityState }): Promise<{ active: boolean }>;
  update(o: { state: ActivityState }): Promise<{ active: boolean }>;
  end(): Promise<void>;
  takeChanges(): Promise<{ state: ActivityState | null }>;
  addListener(event: 'change', cb: () => void): Promise<PluginListenerHandle>;
}

const plugin = registerPlugin<BrioLiveActivityPlugin>('BrioLiveActivity');

/** Hay Live Activity si es la app de iOS y el plugin está (builds viejos no lo traen). */
export const liveActivitySupported = () =>
  Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('BrioLiveActivity');

export const liveActivity = plugin;
