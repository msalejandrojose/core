/**
 * Ciclo de vida de una recomendación. Las recomendaciones se recalculan en
 * cada consulta; lo único que se recuerda es cuándo apareció cada una y si el
 * usuario la descartó.
 */
export type RecommendationStatus = 'ACTIVE' | 'DISMISSED' | 'RESOLVED';

export interface RecommendationState {
  key: string;
  status: RecommendationStatus;
  firstDetectedOn: string;
  lastSeenOn: string;
}

/**
 * Cruza las recomendaciones que se cumplen hoy con lo guardado.
 *
 * - Nueva → ACTIVE, detectada hoy.
 * - Sigue cumpliéndose → conserva su estado (incluido DISMISSED) y su fecha.
 * - Dejó de cumplirse → RESOLVED.
 * - Vuelve a cumplirse tras resolverse → ACTIVE otra vez, con fecha de hoy:
 *   es una detección nueva, y un descarte antiguo ya no aplica.
 */
export function reconcile(
  stored: RecommendationState[],
  currentKeys: string[],
  today: string,
): RecommendationState[] {
  const byKey = new Map(stored.map((s) => [s.key, s]));
  const current = new Set(currentKeys);
  const next: RecommendationState[] = [];

  for (const key of current) {
    const prev = byKey.get(key);
    next.push(
      !prev || prev.status === 'RESOLVED'
        ? { key, status: 'ACTIVE', firstDetectedOn: today, lastSeenOn: today }
        : { ...prev, lastSeenOn: today },
    );
  }
  for (const prev of stored) {
    if (!current.has(prev.key)) next.push({ ...prev, status: 'RESOLVED' });
  }
  return next;
}
