export type OnlineRaceParticipantRole = 'PLAYER' | 'TARGET' | 'THREAT';

// El resultado de uno de los hasta 3 corredores de una carrera online
// (TASK-282/283). `position` y `deltaMs` llegan ya calculados: se fijan al
// registrar la carrera y no se recalculan al leerla.
export class OnlineRaceParticipant {
  constructor(
    readonly role: OnlineRaceParticipantRole,
    readonly userId: string,
    readonly durationMs: number,
    readonly position: number,
    readonly deltaMs: number,
  ) {}
}

// Una tanda de carrera asíncrona ya jugada de principio a fin: el jugador
// contra hasta dos fantasmas rivales (TASK-283). El emparejamiento en sí —
// qué rivales tocan — lo decide otra pieza (TASK-284); aquí solo se
// registra el resultado de una carrera ya corrida.
export class OnlineRace {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly trackId: string,
    readonly createdAt: Date,
    // Ordenados por posición ascendente — el podio, tal cual se guardó.
    readonly participants: OnlineRaceParticipant[],
  ) {}
}
