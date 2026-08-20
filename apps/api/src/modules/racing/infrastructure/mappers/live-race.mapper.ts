import {
  LiveRace,
  LiveRaceParticipant,
  LiveRaceStatus,
} from '../../domain/entities/live-race.entity';

// Fila esperada: `RacingLiveRace` con `participants` incluidos
// (`orderBy: { position: 'asc' }`). `resolveLiveRaceResult` numera también
// a los DNF por detrás del último que sí terminó, así que `position` sale
// siempre relleno — nunca hay huecos que ordenar.
export interface LiveRaceRowWithParticipants {
  id: string;
  trackId: string;
  status: string;
  createdAt: Date;
  finishedAt: Date;
  participants: {
    userId: string;
    durationMs: number | null;
    position: number | null;
    deltaMs: number | null;
    disconnected: boolean;
  }[];
}

export function toLiveRaceDomain(row: LiveRaceRowWithParticipants): LiveRace {
  return new LiveRace(
    row.id,
    row.trackId,
    row.status as LiveRaceStatus,
    row.createdAt,
    row.finishedAt,
    row.participants.map(
      (p): LiveRaceParticipant => ({
        userId: p.userId,
        durationMs: p.durationMs,
        position: p.position,
        deltaMs: p.deltaMs,
        disconnected: p.disconnected,
      }),
    ),
  );
}
