// Sesión de actividad registrada. `kcalBurned` es un snapshot calculado en el
// momento del registro (depende del peso de ese día y del MET vigente):
// recalcularlo después reescribiría el histórico del usuario.
import type { ActivityKind, StrengthSet } from './performance.entity';

export type ActivitySource =
  | 'MANUAL'
  | 'HEALTHKIT'
  | 'GOOGLE_FIT'
  | 'STRAVA'
  | 'GARMIN';

export type Effort = 'LIGHT' | 'MODERATE' | 'VIGOROUS';

export interface ActivitySession {
  id: string;
  userId: string;
  activityTypeId: string;
  /** Nombre del tipo de actividad, para no obligar a un join en el cliente. */
  activityTypeName: string;
  startedAt: Date;
  /** Día natural al que se imputa (`YYYY-MM-DD`), ya resuelto con la timezone. */
  loggedOn: string;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  cadence: number | null;
  /** Esfuerzo percibido CR10 (1–10). */
  rpe: number | null;
  /** Segundos en Z1..Z5, si el dispositivo los dio. */
  zoneSeconds: number[] | null;
  kind: ActivityKind;
  /** Series de fuerza, en orden. Vacío en cardio. */
  sets: StrengthSet[];
  effort: Effort | null;
  kcalBurned: number;
  notes: string | null;
  source: ActivitySource;
}
