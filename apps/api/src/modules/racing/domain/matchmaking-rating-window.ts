// Cuánto puede diferir el rating de quien llega del rating medio de una
// sala en espera, según cuánto lleve esa sala esperando (TASK-323, tarea
// 4): al principio solo empareja rivales de nivel parecido; cuanto más
// tiempo pasa sin llenarse, más se abre la mano — sin techo, mejor jugar
// contra alguien de nivel distinto que no jugar nunca. El relleno con
// rivales ficticios cuando no hay NADIE (tarea 5) es un mecanismo aparte,
// para cuando ni siquiera ensanchar la ventana basta.
const BASE_WINDOW = 100;
const GROWTH_PER_SECOND = 50;

export function matchmakingRatingWindow(waitMs: number): number {
  const waitSeconds = Math.max(0, waitMs) / 1000;
  return BASE_WINDOW + GROWTH_PER_SECOND * waitSeconds;
}
