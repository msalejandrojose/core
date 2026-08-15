import { GhostSnapshot } from './entities/ghost-snapshot';

// Un rival ya resuelto: quién es y su fantasma completo, listo para que el
// cliente lo reproduzca junto al jugador.
export interface OnlineRaceRivalCandidate {
  userId: string;
  durationMs: number;
  snapshots: GhostSnapshot[];
}

export interface ResolveOnlineRaceRivalsInput {
  player: {
    userId: string;
    durationMs: number;
    // Null si la marca actual del jugador es de antes de que existiera el
    // fantasma (TASK-219) — entonces tampoco hay con qué hacer de objetivo
    // de repuesto.
    snapshots: GhostSnapshot[] | null;
  };
  // Vecino inmediato mejor en el leaderboard CON fantasma grabado, o null si
  // no hay ninguno así (el jugador ya va primero entre los que tienen
  // fantasma).
  targetCandidate: OnlineRaceRivalCandidate | null;
  // Vecino inmediato peor en el leaderboard CON fantasma grabado, o null si
  // no hay ninguno así.
  threatCandidate: OnlineRaceRivalCandidate | null;
}

export interface OnlineRaceRivals {
  target: OnlineRaceRivalCandidate | null;
  threat: OnlineRaceRivalCandidate | null;
}

// Aplica la decisión de TASK-282 sobre unos candidatos YA buscados (la
// búsqueda en sí vive en el repositorio — esto es la regla de negocio pura,
// separada para poder testearla sin base de datos):
//
// 1. Objetivo = el vecino justo por delante. Si no hay ninguno (el jugador
//    ya va primero entre quienes tienen fantasma grabado), el objetivo pasa
//    a ser su propio fantasma — báteta a ti mismo (TASK-220).
// 2. Amenaza = el vecino justo por detrás. Sin repuesto: si no hay nadie
//    peor, la carrera sale sin amenaza en vez de inventar un rival que no
//    existe.
export function resolveOnlineRaceRivals(
  input: ResolveOnlineRaceRivalsInput,
): OnlineRaceRivals {
  const target =
    input.targetCandidate ??
    (input.player.snapshots
      ? {
          userId: input.player.userId,
          durationMs: input.player.durationMs,
          snapshots: input.player.snapshots,
        }
      : null);

  return { target, threat: input.threatCandidate };
}
