import { useCallback, useEffect, useState } from 'react';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { call, isApiError } from '../api';

/** Contrato de `/brio/routines`: rutinas guardadas del usuario. */

export type RoutineKind = 'STRENGTH' | 'RUN' | 'CYCLE' | 'WALK' | 'HIKE' | 'SWIM' | 'ELLIPTICAL' | 'OTHER_CARDIO' | 'OTHER';

export interface RoutineExercise {
  exerciseId: string;
  code: string | null;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSec: number | null;
  muscles: { muscle: string; weight: number }[];
}

export interface MuscleShare {
  muscle: string;
  share: number;
  primary: boolean;
}

export interface Routine {
  id: string;
  name: string;
  kind: RoutineKind;
  notes: string | null;
  plannedDurationMin: number | null;
  plannedDistanceM: number | null;
  targetPaceSecPerKm: number | null;
  hevyRoutineId: string | null;
  hevySentAt: string | null;
  exercises: RoutineExercise[];
  muscles: MuscleShare[];
  lastDoneAt: string | null;
  timesDone: number;
}

export interface SaveRoutineBody {
  name: string;
  kind: RoutineKind;
  notes?: string | null;
  plannedDurationMin?: number | null;
  plannedDistanceM?: number | null;
  targetPaceSecPerKm?: number | null;
  exercises?: { exerciseId: string; sets: number; reps: number; weightKg?: number | null; restSec?: number | null }[];
}

export interface RoutineSentToHevy {
  hevyRoutineId: string | null;
  updated: boolean;
  exercises: number;
  skipped: string[];
}

export interface RoutineGarminSync {
  sync: { imported: number; updated: number; skipped: number; healthDays: number };
  linkedSessionId: string | null;
}

export const routinesApi = {
  list: () => call<Routine[]>('GET', '/brio/routines'),
  get: (id: string) => call<Routine>('GET', `/brio/routines/${id}`),
  create: (body: SaveRoutineBody) => call<Routine>('POST', '/brio/routines', { body }),
  update: (id: string, body: SaveRoutineBody) => call<Routine>('PUT', `/brio/routines/${id}`, { body }),
  remove: (id: string) => call<void>('DELETE', `/brio/routines/${id}`),
  sendToHevy: (id: string) => call<RoutineSentToHevy>('POST', `/brio/routines/${id}/hevy`),
  garminSync: (id: string) => call<RoutineGarminSync>('POST', `/brio/routines/${id}/garmin-sync`),
};

const ERROR_TEXT: Record<string, string> = {
  BRIO_HEVY_NOT_CONNECTED: 'Conecta Hevy en Perfil → Conexiones para mandarle rutinas.',
  BRIO_HEVY_KEY_INVALID: 'Hevy no acepta tu clave. Vuelve a conectarlo en Conexiones.',
  BRIO_HEVY_NO_MATCHING_EXERCISES: 'Ninguno de los ejercicios tiene equivalente en Hevy.',
  BRIO_HEVY_RATE_LIMIT: 'Hevy está limitando las peticiones. Prueba en unos minutos.',
  BRIO_HEVY_UNAVAILABLE: 'No hemos podido hablar con Hevy. Prueba en un rato.',
  BRIO_GARMIN_NOT_CONNECTED: 'Conecta Garmin en Perfil → Conexiones para traer el entreno.',
  BRIO_GARMIN_KEY_INVALID: 'Garmin no acepta tu clave. Renuévala en Conexiones.',
  BRIO_GARMIN_UNAVAILABLE: 'No hemos podido hablar con Garmin. Prueba en un rato.',
  BRIO_ROUTINE_EXERCISES_REQUIRED: 'Añade al menos un ejercicio.',
  BRIO_ROUTINE_NAME_REQUIRED: 'Ponle un nombre a la rutina.',
};

export function routineErrorText(e: unknown): string | undefined {
  if (!isApiError(e)) return undefined;
  return ERROR_TEXT[e.code] ?? ERROR_TEXT[e.message] ?? e.message;
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    routinesApi
      .list()
      .then((r) => alive && setRoutines(r))
      .catch(() => alive && setRoutines([]));
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { routines, reload };
}

/** Esquema de la app de Hevy (iOS lo exige declarado en LSApplicationQueriesSchemes). */
const HEVY_SCHEME = 'hevy://';
const HEVY_WEB = 'https://hevy.com';

/**
 * Abre la app de Hevy (la rutina ya está en «Rutinas»). Si no está instalada o
 * en la web, abre hevy.com.
 */
export async function openHevy(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await AppLauncher.canOpenUrl({ url: HEVY_SCHEME });
      if (value) {
        await AppLauncher.openUrl({ url: HEVY_SCHEME });
        return;
      }
    } catch {
      // Sin la app: a la web.
    }
  }
  window.open(HEVY_WEB, '_blank');
}
