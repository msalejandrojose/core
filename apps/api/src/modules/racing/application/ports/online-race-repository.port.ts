import {
  OnlineRace,
  OnlineRaceParticipantRole,
} from '../../domain/entities/online-race.entity';

export const ONLINE_RACE_REPOSITORY = Symbol('RACING_ONLINE_RACE_REPOSITORY');

export interface CreateOnlineRaceParticipantData {
  role: OnlineRaceParticipantRole;
  userId: string;
  durationMs: number;
  position: number;
  deltaMs: number;
}

export interface CreateOnlineRaceData {
  userId: string;
  trackId: string;
  participants: CreateOnlineRaceParticipantData[];
}

export interface OnlineRaceRepositoryPort {
  create(data: CreateOnlineRaceData): Promise<OnlineRace>;
  findById(id: string): Promise<OnlineRace | null>;
}
