import { Inject, Injectable } from '@nestjs/common';
import { OnlineRace } from '../../domain/entities/online-race.entity';
import { InvalidOnlineRaceParticipantsError } from '../../domain/errors/invalid-online-race-participants.error';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  OnlineRaceParticipantCandidate,
  validateOnlineRaceParticipants,
} from '../../domain/validate-online-race-participants';
import {
  ONLINE_RACE_REPOSITORY,
  type OnlineRaceRepositoryPort,
} from '../ports/online-race-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

export interface OnlineRaceRivalInput {
  role: 'TARGET' | 'THREAT';
  userId: string;
  durationMs: number;
}

export interface SubmitOnlineRaceResultInput {
  userId: string;
  trackSlug: string;
  durationMs: number;
  rivals: OnlineRaceRivalInput[];
}

// Registra el resultado de una carrera online ya jugada de principio a fin
// (TASK-283). NO decide contra quién se corre — eso lo hace el
// emparejamiento (TASK-284) o el propio cliente al elegir un amigo
// (TASK-223) — aquí solo se valida la lista de corredores que llega y se
// resuelve el podio una única vez.
//
// El propio resultado del jugador viaja aparte (`userId`/`durationMs`) y no
// dentro de la lista de corredores: el servidor ya sabe quién eres por el
// token, pedirle al cliente que declare su propio id sería una fuente de
// verdad redundante que además el juego no tenía por qué conocer.
@Injectable()
export class SubmitOnlineRaceResultUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(ONLINE_RACE_REPOSITORY)
    private readonly races: OnlineRaceRepositoryPort,
  ) {}

  async execute(input: SubmitOnlineRaceResultInput): Promise<OnlineRace> {
    const track = await this.tracks.findBySlug(input.trackSlug);
    if (!track) throw new TrackNotFoundError(input.trackSlug);

    const candidates: OnlineRaceParticipantCandidate[] = [
      { role: 'PLAYER', userId: input.userId, durationMs: input.durationMs },
      ...input.rivals,
    ];

    const validation = validateOnlineRaceParticipants(candidates, input.userId);
    if (!validation.ok) {
      throw new InvalidOnlineRaceParticipantsError(
        validation.reason,
        validation.details,
      );
    }

    return this.races.create({
      userId: input.userId,
      trackId: track.id,
      participants: validation.participants.map((p) => ({
        role: p.role,
        userId: p.userId,
        durationMs: p.durationMs,
        position: p.position,
        deltaMs: p.deltaMs,
      })),
    });
  }
}
