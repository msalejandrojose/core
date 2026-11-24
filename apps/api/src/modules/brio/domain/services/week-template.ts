import type { PlanLoad, PlannedSession } from '../entities/plan.entity';
import { templateByCode } from './plan';

/**
 * Semana tipo (TASK-429): lo que el usuario hace cada semana —futsal el martes
 * a las 21:00, fútbol 7 el sábado a las 10:00, gimnasio lunes, miércoles y
 * viernes— para rellenar cualquier semana de un toque. Dominio puro.
 */

export interface WeekSlot {
  /** 1 = lunes … 7 = domingo. */
  weekday: number;
  /** Plantilla de sesión (`futsal`, `gym`, `z2`…). */
  templateCode: string;
  /** Título propio (p. ej. el nombre de la rutina); si no, el de la plantilla. */
  title: string | null;
  /** "HH:MM" en la zona del usuario. */
  startTime: string | null;
  durationMin: number | null;
  /** Rutina de gimnasio que toca ese día, si se eligió una. */
  routineId: string | null;
}

export const MAX_WEEK_SLOTS = 21;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Motivo por el que una semana tipo no vale, o null si vale. */
export function invalidWeekSlots(slots: WeekSlot[]): string | null {
  if (slots.length > MAX_WEEK_SLOTS) return `Como mucho ${MAX_WEEK_SLOTS} actividades por semana.`;
  for (const s of slots) {
    if (!Number.isInteger(s.weekday) || s.weekday < 1 || s.weekday > 7) return 'Día de la semana no válido.';
    if (!templateByCode(s.templateCode)) return `Actividad desconocida: ${s.templateCode}.`;
    if (s.startTime !== null && !TIME.test(s.startTime)) return 'La hora debe ser HH:MM.';
    if (s.durationMin !== null && (!Number.isInteger(s.durationMin) || s.durationMin < 5 || s.durationMin > 600))
      return 'La duración debe estar entre 5 y 600 minutos.';
  }
  return null;
}

export type SlotSession = Pick<
  PlannedSession,
  | 'kind'
  | 'templateCode'
  | 'title'
  | 'load'
  | 'startTime'
  | 'plannedDurationMin'
  | 'plannedDistanceM'
  | 'targetPaceSecPerKm'
  | 'structure'
  | 'notes'
>;

const LOAD_RANK: Record<PlanLoad, number> = { REST: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };

function slotSession(slot: WeekSlot): SlotSession | null {
  const t = templateByCode(slot.templateCode);
  if (!t) return null;
  return {
    kind: t.kind,
    templateCode: t.code,
    title: slot.title?.trim() || t.title,
    load: t.load,
    startTime: slot.startTime,
    plannedDurationMin: slot.durationMin ?? t.durationMin,
    plannedDistanceM: t.distanceM,
    targetPaceSecPerKm: null,
    structure: slot.routineId ? { ...(t.structure ?? {}), routineId: slot.routineId } : t.structure,
    notes: null,
  };
}

/**
 * La semana (lunes a domingo) que sale de la semana tipo. Solo cabe una
 * sesión por día, así que dos actividades el mismo día se juntan en una:
 * «Gimnasio + Fútbol sala», con la carga más alta, la hora más temprana y la
 * suma de minutos; cada parte queda en `structure.parts`.
 */
export function weekFromSlots(slots: WeekSlot[]): (SlotSession | null)[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const parts = slots
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'))
      .map(slotSession)
      .filter((x): x is SlotSession => x !== null);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    const main = parts.reduce((a, b) => (LOAD_RANK[b.load] > LOAD_RANK[a.load] ? b : a));
    const minutes = parts.every((p) => p.plannedDurationMin == null)
      ? null
      : parts.reduce((t, p) => t + (p.plannedDurationMin ?? 0), 0);
    return {
      kind: main.kind,
      templateCode: null,
      title: parts.map((p) => p.title).join(' + ').slice(0, 120),
      load: main.load,
      startTime: parts.find((p) => p.startTime)?.startTime ?? null,
      plannedDurationMin: minutes,
      plannedDistanceM: null,
      targetPaceSecPerKm: null,
      structure: {
        parts: parts.map((p) => ({
          templateCode: p.templateCode,
          title: p.title,
          startTime: p.startTime,
          durationMin: p.plannedDurationMin,
          routineId: (p.structure?.routineId as string | undefined) ?? null,
        })),
      },
      notes: null,
    };
  });
}
