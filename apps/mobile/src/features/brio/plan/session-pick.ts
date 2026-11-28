import type { PlanFavorite, PlanTemplate } from './plan.api';

/** Disciplinas en las que tiene sentido una distancia. */
const DISTANCE_KINDS = new Set(['RUN', 'CYCLE', 'WALK', 'HIKE', 'SWIM']);
export const hasDistance = (kind: string) => DISTANCE_KINDS.has(kind);

/** Qué está elegido para el día: la rutina manda; si no, la plantilla. */
export function selectionKey(routineId: string | null, templateCode: string | null): string | null {
  if (routineId) return `r:${routineId}`;
  if (templateCode) return `t:${templateCode}`;
  return null;
}

/** Si un favorito es lo que hay elegido (por rutina, plantilla o nombre). */
export function isFavoriteSelected(f: PlanFavorite, sel: { routineId: string | null; templateCode: string | null; title: string }): boolean {
  if (f.routineId) return f.routineId === sel.routineId;
  if (sel.routineId) return false;
  if (f.key.startsWith('t:')) return f.templateCode === sel.templateCode;
  return f.title.trim().toLocaleLowerCase('es') === sel.title.trim().toLocaleLowerCase('es');
}

/** Lo que rellena un favorito en el formulario de la sesión. */
export function favoriteForm(f: PlanFavorite, templates: PlanTemplate[]) {
  const t = f.templateCode ? templates.find((x) => x.code === f.templateCode) : undefined;
  return {
    routineId: f.routineId,
    templateCode: t ? t.code : null,
    kind: f.kind,
    title: f.title,
    load: f.load,
    minutes: f.durationMin ? String(f.durationMin) : t?.durationMin ? String(t.durationMin) : '',
    km: f.distanceM ? String(Math.round(f.distanceM / 100) / 10).replace('.', ',') : '',
    reps: typeof t?.structure?.reps === 'number' ? t.structure.reps : null,
  };
}

/** «12 veces · 1 h» bajo cada favorito. */
export function favoriteMeta(f: Pick<PlanFavorite, 'times' | 'durationMin' | 'distanceM'>): string {
  const parts = [f.times === 1 ? '1 vez' : `${f.times} veces`];
  if (f.durationMin) parts.push(f.durationMin >= 60 && f.durationMin % 60 === 0 ? `${f.durationMin / 60} h` : `${f.durationMin} min`);
  if (f.distanceM) parts.push(`${String(Math.round(f.distanceM / 100) / 10).replace('.', ',')} km`);
  return parts.join(' · ');
}
