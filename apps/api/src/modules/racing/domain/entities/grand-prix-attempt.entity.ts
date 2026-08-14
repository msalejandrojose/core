export type GrandPrixAttemptStatus = 'IN_PROGRESS' | 'COMPLETED';

// Resultado de una manga (un circuito) ya corrida dentro de un intento.
export class GrandPrixStageResult {
  constructor(
    readonly trackId: string,
    readonly durationMs: number,
    readonly completedAt: Date,
  ) {}
}

// Un intento de un jugador de correr un Grand Prix entero (TASK-247/248).
// Como mucho uno IN_PROGRESS a la vez por (jugador, Grand Prix) — es el que
// se reanuda; puede haber muchos COMPLETED, cada uno una carrera distinta.
export class GrandPrixAttempt {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly grandPrixId: string,
    readonly status: GrandPrixAttemptStatus,
    readonly totalDurationMs: number | null,
    readonly startedAt: Date,
    readonly completedAt: Date | null,
    // Ordenados por `completedAt` ascendente — el orden real en que se corrieron.
    readonly results: GrandPrixStageResult[],
  ) {}
}
