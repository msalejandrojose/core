import { useCallback, useEffect, useState } from 'react';
import { call } from '../api';

/** Contrato de `/ritmo/plan/*`. Tipos a mano, como el resto de la capa de API. */

export type PlanLoad = 'REST' | 'LOW' | 'MEDIUM' | 'HIGH';
export type DayStatus = 'DONE' | 'TODAY' | 'PLANNED' | 'MISSED' | 'SKIPPED' | 'REST' | 'FREE';

export interface PlanTemplate {
  code: string;
  title: string;
  short: string;
  kind: string;
  load: PlanLoad;
  durationMin: number | null;
  distanceM: number | null;
  structure: Record<string, unknown> | null;
}

export interface PlannedSession {
  id: string;
  day: string;
  kind: string;
  templateCode: string | null;
  title: string;
  load: PlanLoad;
  startTime: string | null;
  plannedDurationMin: number | null;
  plannedDistanceM: number | null;
  targetPaceSecPerKm: number | null;
  structure: Record<string, unknown> | null;
  notes: string | null;
  completedAt: string | null;
  completedSessionId: string | null;
  actualNotes: string | null;
  skipped: boolean;
}

export interface PlanDay {
  day: string;
  planned: PlannedSession | null;
  status: DayStatus;
  actual: { id: string; kind: string; title: string; durationSec: number; distanceM: number | null } | null;
  autoCompleted: boolean;
}

export interface DayDiet {
  day: string;
  load: PlanLoad;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface PlanGoal {
  id: string;
  name: string;
  raceDate: string | null;
  raceDistanceM: number | null;
  targetTimeSec: number | null;
  notes: string | null;
  daysToRace: number | null;
  weeksToRace: number | null;
}

export interface PlanWeek {
  from: string;
  to: string;
  isoWeek: number;
  today: string;
  days: PlanDay[];
  summary: { planned: number; done: number; missed: number; plannedMinutes: number };
  plan: PlanGoal | null;
  diet: DayDiet[] | null;
  baseKcal: number | null;
}

export interface SetDayBody {
  templateCode?: string;
  kind?: string;
  title?: string;
  load?: PlanLoad;
  startTime?: string | null;
  plannedDurationMin?: number | null;
  plannedDistanceM?: number | null;
  targetPaceSecPerKm?: number | null;
  structure?: Record<string, unknown> | null;
  notes?: string | null;
}

export const planApi = {
  week: (day?: string) =>
    call<PlanWeek>('GET', '/ritmo/plan/week', { params: { query: day ? { day } : {} } }),
  templates: () => call<PlanTemplate[]>('GET', '/ritmo/plan/templates'),
  saveGoal: (body: { name: string; raceDate?: string | null; raceDistanceM?: number | null; targetTimeSec?: number | null }) =>
    call<PlanGoal>('PUT', '/ritmo/plan', { body }),
  archiveGoal: () => call<void>('DELETE', '/ritmo/plan'),
  setDay: (day: string, body: SetDayBody) => call<PlannedSession>('PUT', `/ritmo/plan/days/${day}`, { body }),
  clearDay: (day: string) => call<void>('DELETE', `/ritmo/plan/days/${day}`),
  complete: (day: string, body: { done: boolean; skipped?: boolean; sessionId?: string | null; actualNotes?: string | null }) =>
    call<PlannedSession>('PUT', `/ritmo/plan/days/${day}/completion`, { body }),
  fill: (day: string, mode: 'TEMPLATE' | 'COPY_PREVIOUS', replace = false) =>
    call<{ written: number }>('POST', '/ritmo/plan/week/fill', { body: { day, mode, replace } }),
};

/** La semana de `day` (o la actual), con recarga manual tras cada cambio. */
export function usePlanWeekData(day?: string) {
  const [data, setData] = useState<PlanWeek | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    planApi
      .week(day)
      .then((w) => alive && setData(w))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [day, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}
