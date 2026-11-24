import { create } from 'zustand';
import {
  isApiError,
  brioApi,
  type DaySummary,
  type BrioProfile,
  type SaveProfileBody,
} from './api';
import { todayIn } from './format';
import { useAuthStore } from '@/store/auth.store';
import { readSnapshot, writeSnapshot } from './today-snapshot';

const currentUserId = () => useAuthStore.getState().user?.id ?? null;

/** Guarda la foto de Hoy si lo que hay en el store es el día de hoy. */
function saveSnapshot(state: { profile: BrioProfile | null; day: string; summary: DaySummary | null }) {
  const { profile, day, summary } = state;
  if (!profile) return;
  const isToday = day === todayIn(profile.timezone);
  writeSnapshot(currentUserId(), profile, isToday ? day : null, isToday ? summary : null);
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Estado compartido de Brío: el perfil y el día que se está viendo.
 *
 * Vive en un store y no en el estado de la pantalla porque lo leen y lo
 * invalidan varias piezas a la vez: la pantalla Hoy, los sheets de registro
 * (al guardar hay que refrescar el día) y Progreso (necesita la timezone del
 * perfil para saber qué día es "hoy").
 *
 * `needsOnboarding` es un estado de primera clase, no un error: la API
 * devuelve 404 `BRIO_PROFILE_NOT_FOUND` mientras el usuario no ha
 * configurado su perfil, y la app lo traduce a "llévame al onboarding".
 */
interface BrioState {
  profile: BrioProfile | null;
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

export const useBrioStore = create<BrioState>((set, get) => ({
  profile: null,
  profileStatus: 'idle',
  needsOnboarding: false,
  day: todayIn('Europe/Madrid'),
  summary: null,
  dayStatus: 'idle',

  loadProfile: async () => {
    // Al abrir la app: pinta al instante la última foto de Hoy guardada y
    // refresca por detrás (la API puede tardar en despertar).
    const snap = get().profile ? null : readSnapshot(currentUserId());
    if (snap) {
      const today = todayIn(snap.profile.timezone);
      const fresh = snap.day === today && snap.summary;
      set({
        profile: snap.profile,
        profileStatus: 'ready',
        needsOnboarding: false,
        day: today,
        ...(fresh ? { summary: snap.summary, dayStatus: 'ready' as const } : {}),
      });
      if (fresh) void get().refreshDay();
    } else {
      set({ profileStatus: 'loading' });
    }
    try {
      const profile = await brioApi.getProfile();
      const sameDay = get().day === todayIn(profile.timezone);
      set({
        profile,
        profileStatus: 'ready',
        needsOnboarding: false,
        // El "hoy" real depende de la zona del perfil, no de la del
        // dispositivo: así el día que muestra la app coincide con el que
        // agrega la API.
        day: todayIn(profile.timezone),
        // Si la foto guardada era de otra zona horaria, el día cambia.
        ...(snap && !sameDay ? { summary: null, dayStatus: 'idle' as const } : {}),
      });
      saveSnapshot(get());
    } catch (e) {
      if (isApiError(e) && e.code === 'BRIO_PROFILE_NOT_FOUND') {
        set({ profileStatus: 'ready', needsOnboarding: true, profile: null, summary: null, dayStatus: 'idle' });
        return;
      }
      // Con la foto guardada en pantalla, un fallo de red no la tapa.
      if (!snap) set({ profileStatus: 'error' });
    }
  },

  saveProfile: async (body) => {
    const profile = await brioApi.saveProfile(body);
    set({
      profile,
      profileStatus: 'ready',
      needsOnboarding: false,
      day: todayIn(profile.timezone),
    });
    saveSnapshot(get());
    await get().refreshDay();
  },

  loadDay: async (day) => {
    const target = day ?? get().day;
    set({ dayStatus: 'loading', day: target });
    try {
      const summary = await brioApi.getDay(target);
      // Si mientras tanto se pidió otro día, esta respuesta ya no vale.
      if (get().day !== target) return;
      set({ summary, dayStatus: 'ready' });
      saveSnapshot(get());
    } catch {
      if (get().day === target) set({ dayStatus: 'error' });
    }
  },

  refreshDay: async () => {
    const { day } = get();
    try {
      const summary = await brioApi.getDay(day);
      if (get().day !== day) return;
      set({ summary, dayStatus: 'ready' });
      saveSnapshot(get());
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
