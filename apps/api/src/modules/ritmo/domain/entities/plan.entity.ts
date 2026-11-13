import type { ActivityKind } from './performance.entity';

/** Objetivo de entrenamiento: una carrera, por ejemplo. */
export interface Plan {
  id: string;
  name: string;
  /** Día de la carrera o de la meta (`YYYY-MM-DD`). */
  raceDate: string | null;
  raceDistanceM: number | null;
  targetTimeSec: number | null;
  notes: string | null;
  isActive: boolean;
}

/** Carga prevista de una sesión: mueve la dieta de ese día. */
export type PlanLoad = 'REST' | 'LOW' | 'MEDIUM' | 'HIGH';

/** Lo planificado para un día. */
export interface PlannedSession {
  id: string;
  planId: string | null;
  day: string;
  kind: ActivityKind;
  templateCode: string | null;
  title: string;
  load: PlanLoad;
  /** "HH:MM" en la zona del usuario. */
  startTime: string | null;
  plannedDurationMin: number | null;
  plannedDistanceM: number | null;
  targetPaceSecPerKm: number | null;
  /** Detalle libre: series, repeticiones, ejercicios. */
  structure: Record<string, unknown> | null;
  notes: string | null;
  completedAt: Date | null;
  completedSessionId: string | null;
  /** Lo que se hizo de verdad, en palabras del usuario. */
  actualNotes: string | null;
  skipped: boolean;
}

/** Lo que el plan necesita saber de un entreno real. */
export interface ActualSession {
  id: string;
  day: string;
  kind: ActivityKind;
  title: string;
  durationSec: number;
  distanceM: number | null;
}
