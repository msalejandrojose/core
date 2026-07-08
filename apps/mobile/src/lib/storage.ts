import { Preferences } from '@capacitor/preferences';
import type { StateStorage } from 'zustand/middleware';

/**
 * Adaptador de almacenamiento para `zustand/persist` sobre
 * `@capacitor/preferences`. En nativo usa el almacén seguro de la plataforma
 * (Keychain/SharedPreferences según el plugin); en web/PWA cae a `localStorage`
 * de forma transparente. La API es asíncrona, así que el store se rehidrata de
 * forma diferida (ver `hasHydrated` en auth.store).
 */
export const capacitorStorage: StateStorage = {
  getItem: async (name) => {
    const { value } = await Preferences.get({ key: name });
    return value;
  },
  setItem: async (name, value) => {
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name) => {
    await Preferences.remove({ key: name });
  },
};
