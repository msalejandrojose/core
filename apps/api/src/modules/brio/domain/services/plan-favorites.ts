import type { ActivityKind } from '../entities/performance.entity';
import type { PlanLoad, PlannedSession } from '../entities/plan.entity';
import type { PlanTemplate } from './plan';

/**
 * «Lo que más repites»: las sesiones que más planifica o hace la persona, para
 * ponerlas arriba al planificar un día y rellenarlo de un toque. Se agrupan por
 * rutina guardada, si la hay; si no, por plantilla; si no, por nombre.
 */
export interface PlanFavorite {
  key: string;
  routineId: string | null;
  templateCode: string | null;
  title: string;
  kind: ActivityKind;
  load: PlanLoad;
  durationMin: number | null;
  distanceM: number | null;
  /** Veces que se ha planificado (o hecho, para las rutinas) en el periodo. */
  times: number;
  /** Último día en que se planificó, para desempatar. */
  lastDay: string | null;
}

export interface FavoriteRoutine {
  id: string;
  name: string;
  kind: ActivityKind;
  plannedDurationMin: number | null;
  plannedDistanceM: number | null;
  timesDone: number;
}

const routineOf = (s: PlannedSession) =>
  typeof s.structure?.routineId === 'string' ? s.structure.routineId : null;

export function planFavorites(
  planned: readonly PlannedSession[],
  routines: readonly FavoriteRoutine[],
  templates: readonly PlanTemplate[],
  limit = 5,
): PlanFavorite[] {
  const byRoutine = new Map(routines.map((r) => [r.id, r]));
  const byTemplate = new Map(templates.map((t) => [t.code, t]));
  const groups = new Map<string, PlanFavorite>();

  // Del más reciente al más antiguo: el primero que entra fija hora, carga y duración.
  const sorted = [...planned]
    .filter((s) => s.load !== 'REST' && s.templateCode !== 'rest')
    .sort((a, b) => b.day.localeCompare(a.day));
  for (const s of sorted) {
    const rid = routineOf(s);
    const routine = rid ? byRoutine.get(rid) : undefined;
    // Una rutina borrada ya no se puede elegir: cuenta por su plantilla o nombre.
    const key = routine
      ? `r:${routine.id}`
      : s.templateCode && byTemplate.has(s.templateCode)
        ? `t:${s.templateCode}`
        : `n:${s.title.trim().toLocaleLowerCase('es')}`;
    const cur = groups.get(key);
    if (cur) {
      cur.times += 1;
      continue;
    }
    groups.set(key, {
      key,
      routineId: routine?.id ?? null,
      templateCode: s.templateCode,
      title: routine?.name ?? s.title,
      kind: s.kind,
      load: s.load,
      durationMin: s.plannedDurationMin,
      distanceM: s.plannedDistanceM,
      times: 1,
      lastDay: s.day,
    });
  }

  // Rutinas que se hacen aunque no se planifiquen (o se hacen más de lo planificado).
  for (const r of routines) {
    if (r.timesDone <= 0) continue;
    const key = `r:${r.id}`;
    const cur = groups.get(key);
    if (cur) cur.times = Math.max(cur.times, r.timesDone);
    else
      groups.set(key, {
        key,
        routineId: r.id,
        templateCode: null,
        title: r.name,
        kind: r.kind,
        load: 'MEDIUM',
        durationMin: r.plannedDurationMin,
        distanceM: r.plannedDistanceM,
        times: r.timesDone,
        lastDay: null,
      });
  }

  return [...groups.values()]
    .sort(
      (a, b) =>
        b.times - a.times || (b.lastDay ?? '').localeCompare(a.lastDay ?? ''),
    )
    .slice(0, limit);
}
