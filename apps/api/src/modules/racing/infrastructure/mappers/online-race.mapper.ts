import {
  OnlineRace,
  OnlineRaceParticipant,
  OnlineRaceParticipantRole,
} from '../../domain/entities/online-race.entity';

// Fila esperada: `RacingOnlineRace` con `participants` incluidos
// (`orderBy: { position: 'asc' }`).
export interface OnlineRaceRowWithParticipants {
  id: string;
  userId: string;
  trackId: string;
  createdAt: Date;
  participants: {
    role: string;
    userId: string;
    durationMs: number;
    position: number;
    deltaMs: number;
  }[];
}

export function toOnlineRaceDomain(
  row: OnlineRaceRowWithParticipants,
): OnlineRace {
  return new OnlineRace(
    row.id,
    row.userId,
    row.trackId,
    row.createdAt,
    row.participants.map(
      (p) =>
        new OnlineRaceParticipant(
          p.role as OnlineRaceParticipantRole,
          p.userId,
          p.durationMs,
          p.position,
          p.deltaMs,
        ),
    ),
  );
}
