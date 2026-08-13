import { Inject, Injectable } from '@nestjs/common';
import { LeaderboardEntry } from '../../domain/entities/lap-time.entity';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  /** Posición del jugador que consulta, aunque quede fuera del top. */
  yourPosition: number | null;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY) private readonly laps: LapTimeRepositoryPort,
  ) {}

  async execute(
    slug: string,
    userId: string,
    limit: number,
  ): Promise<LeaderboardResult> {
    const track = await this.tracks.findBySlug(slug);
    if (track === null) throw new TrackNotFoundError(slug);

    // Siempre se devuelve la posición propia aunque el jugador no esté en el
    // top: saber que vas el 412º es lo que engancha a bajar a 411.
    const [entries, yourPosition] = await Promise.all([
      this.laps.leaderboard(track.id, limit),
      this.laps.positionOf(track.id, userId),
    ]);

    return { entries, yourPosition };
  }
}
