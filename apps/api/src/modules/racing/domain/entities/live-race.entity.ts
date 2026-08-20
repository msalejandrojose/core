export type LiveRaceStatus = 'FINISHED' | 'ABANDONED';

// El resultado de UNO de los corredores reales de una `LiveRace`. Si se
// desconectó sin cruzar la meta, `durationMs`/`position`/`deltaMs` son null
// y `disconnected` es true — un DNF no es un puesto real con tiempo peor.
export interface LiveRaceParticipant {
  readonly userId: string;
  readonly durationMs: number | null;
  readonly position: number | null;
  readonly deltaMs: number | null;
  readonly disconnected: boolean;
}

// Una carrera en vivo ya terminada, con hasta N corredores reales
// simultáneos (TASK-323). A diferencia de `OnlineRace`, aquí no hay
// fantasmas: cada participante estuvo conectado de verdad.
export class LiveRace {
  constructor(
    readonly id: string,
    readonly trackId: string,
    readonly status: LiveRaceStatus,
    readonly createdAt: Date,
    readonly finishedAt: Date,
    // Ordenados por posición ascendente, los DNF al final.
    readonly participants: LiveRaceParticipant[],
  ) {}
}
