import { LiveRaceParticipant } from './entities/live-race.entity';

export interface LiveRaceFinisher {
  userId: string;
  durationMs: number;
}

// Resuelve el podio de una carrera en vivo YA terminada (TASK-323): a
// quienes cruzaron la meta se les ordena por tiempo (posición y delta
// contra el ganador, igual que `validateOnlineRaceParticipants`); a quienes
// se desconectaron sin terminar se les añade detrás, sin tiempo ni delta,
// marcados `disconnected` — un DNF no compite por posición contra un tiempo
// real, solo ocupa el hueco que le queda.
//
// Función pura: no decide CUÁNDO se cierra la carrera (eso es del
// `LiveRaceRoomManager`, que sabe de timers y desconexiones), solo qué
// aspecto tiene el resultado dados los dos grupos ya separados.
export function resolveLiveRaceResult(
  finishers: LiveRaceFinisher[],
  dnfUserIds: string[],
): LiveRaceParticipant[] {
  const sorted = [...finishers].sort((a, b) => a.durationMs - b.durationMs);
  const winnerMs = sorted[0]?.durationMs ?? 0;

  const ranked: LiveRaceParticipant[] = sorted.map((finisher, index) => ({
    userId: finisher.userId,
    durationMs: finisher.durationMs,
    position: index + 1,
    deltaMs: finisher.durationMs - winnerMs,
    disconnected: false,
  }));

  const dnf: LiveRaceParticipant[] = dnfUserIds.map((userId, index) => ({
    userId,
    durationMs: null,
    position: sorted.length + index + 1,
    deltaMs: null,
    disconnected: true,
  }));

  return [...ranked, ...dnf];
}
