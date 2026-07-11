import { SiteEntryStatus } from '../value-objects/site-entry-status.vo';

// Transiciones de estado de un SiteEntry. `from: null` es crear la entry
// por primera vez — se puede crear directamente en cualquier estado (no
// hace falta pasar por WANT_TO_GO antes de VISITED: puedes ir a un sitio
// que no tenías en tu wishlist). Desde un estado existente, en el MVP la
// única transición soportada es WANT_TO_GO → VISITED: no hay "des-visitar"
// (si el usuario se equivocó, borra la entry en vez de revertir el estado).
export function canTransition(from: SiteEntryStatus | null, to: SiteEntryStatus): boolean {
  if (from === null) return true;
  return from === 'WANT_TO_GO' && to === 'VISITED';
}

// Invariante entre status y score: WANT_TO_GO nunca tiene score (no tiene
// sentido puntuar algo que no has visitado). VISITED admite score null —
// marcar un sitio como visitado no obliga a puntuarlo en el momento; puede
// quedar "visitado sin puntuar" hasta que el usuario pase por el flujo de
// ranking por comparación (ver domain/ranking/).
export function isScoreConsistentWithStatus(
  status: SiteEntryStatus,
  score: number | null,
): boolean {
  if (status === 'WANT_TO_GO') return score === null;
  return true;
}
