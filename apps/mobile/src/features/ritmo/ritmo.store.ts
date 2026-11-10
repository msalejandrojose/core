import { create } from 'zustand';
import {
  isApiError,
  ritmoApi,
  type DaySummary,
  type RitmoProfile,
  type SaveProfileBody,
} from './api';
import { todayIn } from './format';

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Estado compartido de Ritmo: el perfil y el día que se está viendo.
 *
 * Vive en un store y no en el estado de la pantalla porque lo leen y lo
 * invalidan varias piezas a la vez: la pantalla Hoy, los sheets de registro
 * (al guardar hay que refrescar el día) y Progreso (necesita la timezone del
 * perfil para saber qué día es "hoy").
 *
 * `needsOnboarding` es un estado de primera clase, no un error: la API
 * devuelve 404 `RITMO_PROFILE_NOT_FOUND` mientras el usuario no ha
 * configurado su perfil, y la app lo traduce a "llévame al onboarding".
 */
interface RitmoState {
  profile: RitmoProfile | null;
  profileStatus: Status;
  needsOnboarding: boolean;

  /** Día que se está viendo (`YYYY-MM-DD`). */
  day: string;
  summary: DaySummary | null;
  dayStatus: Status;

  loadProfile: () => Promise<void>;
  saveProfile: (body: SaveProfileBody) => Promise<void>;
  loadDay: (day?: string) => Promise<void>;
  /** Refresca el día visible (tras registrar comida, actividad o peso). */
  refreshDay: () => Promise<void>;
  /** Mueve el día visible en días naturales (−1 = ayer). */
  stepDay: (delta: number) => Promise<void>;
  /** Vuelve a hoy según la zona horaria del perfil. */
  goToToday: () => Promise<void>;
}

function shift(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export const useRitmoStore = create<RitmoState>((set, get) => ({
  profile: null,
  profileStatus: 'idle',
  needsOnboarding: false,
  day: todayIn('Europe/Madrid'),
  summary: null,
  dayStatus: 'idle',

  loadProfile: async () => {
    set({ profileStatus: 'loading' });
    try {
      const profile = await ritmoApi.getProfile();
      set({
        profile,
        profileStatus: 'ready',
        needsOnboarding: false,
        // El "hoy" real depende de la zona del perfil, no de la del
        // dispositivo: así el día que muestra la app coincide con el que
        // agrega la API.
        day: todayIn(profile.timezone),
      });
    } catch (e) {
      if (isApiError(e) && e.code === 'RITMO_PROFILE_NOT_FOUND') {
        set({ profileStatus: 'ready', needsOnboarding: true, profile: null });
        return;
      }
      set({ profileStatus: 'error' });
    }
  },

  saveProfile: async (body) => {
    const profile = await ritmoApi.saveProfile(body);
    set({
      profile,
      profileStatus: 'ready',
      needsOnboarding: false,
      day: todayIn(profile.timezone),
    });
    await get().refreshDay();
  },

  loadDay: async (day) => {
    const target = day ?? get().day;
    set({ dayStatus: 'loading', day: target });
    try {
      const summary = await ritmoApi.getDay(target);
      set({ summary, dayStatus: 'ready' });
    } catch {
      set({ dayStatus: 'error' });
    }
  },

  refreshDay: async () => {
    const { day } = get();
    try {
      const summary = await ritmoApi.getDay(day);
      set({ summary, dayStatus: 'ready' });
    } catch {
      // Refresco silencioso: el dato anterior sigue siendo mejor que un error
      // a pantalla completa justo después de guardar algo con éxito.
    }
  },

  stepDay: async (delta) => {
    await get().loadDay(shift(get().day, delta));
  },

  goToToday: async () => {
    const timezone = get().profile?.timezone ?? 'Europe/Madrid';
    await get().loadDay(todayIn(timezone));
  },
}));
