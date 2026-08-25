// Cuánto puede diferir el rating de quien llega del rating medio de una
// sala en espera, según cuánto lleve esa sala esperando (TASK-323, tarea
// 4): al principio solo empareja rivales de nivel parecido; cuanto más
// tiempo pasa sin llenarse, más se abre la mano — sin techo, mejor jugar
// contra alguien de nivel distinto que no jugar nunca. El relleno con
// rivales ficticios cuando no hay NADIE (tarea 5) es un mecanismo aparte,
// para cuando ni siquiera ensanchar la ventana basta.
//
// `baseWindow` es editable desde el backoffice (TASK-323, tarea 8) — este
// es solo el valor de partida/por defecto si no hay configuración guardada.
export const DEFAULT_RATING_WINDOW_BASE_POINTS = 100;
const GROWTH_PER_SECOND = 50;

export function matchmakingRatingWindow(
  waitMs: number,
  baseWindow: number = DEFAULT_RATING_WINDOW_BASE_POINTS,
): number {
  const waitSeconds = Math.max(0, waitMs) / 1000;
  return baseWindow + GROWTH_PER_SECOND * waitSeconds;
}
