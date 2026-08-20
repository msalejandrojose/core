import {
  LiveRace,
  LiveRaceParticipant,
  LiveRaceStatus,
} from '../../domain/entities/live-race.entity';

export const LIVE_RACE_REPOSITORY = Symbol('RACING_LIVE_RACE_REPOSITORY');

export interface CreateLiveRaceData {
  trackId: string;
  status: LiveRaceStatus;
  finishedAt: Date;
  // Ya resueltos (posición/delta) por `resolveLiveRaceResult` — se guardan
  // tal cual, igual que `RacingOnlineRaceParticipant` (criterio de TASK-283:
  // no recalcular un podio al leerlo).
  participants: LiveRaceParticipant[];
}

export interface LiveRaceRepositoryPort {
  create(data: CreateLiveRaceData): Promise<LiveRace>;
}
