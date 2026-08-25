export interface RatedResult {
  userId: string;
  /** Puesto EN ESA CARRERA, no en el ranking general — cuanto más bajo, mejor. */
  position: number;
  rating: number;
}

export interface RatingChange {
  userId: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
}

// K alto a propósito: con pocas carreras por jugador al arrancar el modo en
// vivo, conviene que el rating converja rápido a un nivel realista en vez
// de tardar cientos de partidas en asentarse (el K=16-24 de ajedrez asume
// jugadores con miles de partidas detrás). Editable desde el backoffice
// (TASK-323, tarea 8) — este es solo el valor de partida/por defecto si no
// hay configuración guardada.
export const DEFAULT_RATING_K_FACTOR = 32;

// Nunca por debajo de esto: evita que una mala racha mande a alguien a
// rating negativo o a cero, que además rompería la ventana de matchmaking
// de la tarea 4 (no hay "menos que el mínimo" con quien emparejar). No es
// editable desde el backoffice — a diferencia de K o la ventana, no hay un
// valor "razonable" distinto que alguien fuera a querer ajustar.
const RATING_FLOOR = 100;

// Generalización por pares del Elo de dos jugadores a una carrera de N
// corredores reales (TASK-323, tarea 3): cada jugador se compara contra
// CADA rival por separado — 1 si quedó por delante, 0 si no — y su cambio
// de rating es el promedio de (resultado real − resultado esperado) entre
// todos esos rivales, escalado por K. Con solo dos corredores esto se
// reduce exactamente al Elo clásico.
//
// Solo entran quienes SÍ terminaron: un DNF no participa ni como sujeto ni
// como rival de nadie — desconectarse no debe poder hundir el rating de
// otro, ni el suyo propio (decisión: sin penalización por desconexión,
// coherente con el grace period de reconexión del `LiveRaceRoomManager`).
export function computeRatingChanges(
  results: RatedResult[],
  kFactor: number = DEFAULT_RATING_K_FACTOR,
): RatingChange[] {
  if (results.length < 2) return [];

  return results.map((player) => {
    const opponents = results.filter((o) => o.userId !== player.userId);
    const scoreSum = opponents.reduce((sum, opponent) => {
      const expected = 1 / (1 + 10 ** ((opponent.rating - player.rating) / 400));
      const actual = player.position < opponent.position ? 1 : 0;
      return sum + (actual - expected);
    }, 0);

    const delta = Math.round((kFactor * scoreSum) / opponents.length);
    const ratingAfter = Math.max(RATING_FLOOR, player.rating + delta);

    return {
      userId: player.userId,
      ratingBefore: player.rating,
      ratingAfter,
      // El delta que se cuenta es el que de verdad se aplicó, ya con el
      // piso puesto — no el bruto, que induciría a error a quien lo lea.
      delta: ratingAfter - player.rating,
    };
  });
}
