import { Inject, Injectable } from '@nestjs/common';
import { LeaderboardEntry } from '../../domain/entities/lap-time.entity';
import { SeasonNotFoundError } from '../../domain/errors/season-not-found.error';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  LAP_TIME_REPOSITORY,
  type LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import {
  SEASON_REPOSITORY,
  type SeasonRepositoryPort,
} from '../ports/season-repository.port';
import {
  TRACK_REPOSITORY,
  type TrackRepositoryPort,
} from '../ports/track-repository.port';

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  /** Posición del jugador que consulta, aunque quede fuera del top. */
  yourPosition: number | null;
  /** Temporada a la que está acotada esta clasificación, o null si es el
   *  histórico completo (TASK-227): sin temporada pedida explícitamente y
   *  sin ninguna abierta, el leaderboard sigue funcionando sin acotar en vez
   *  de salir vacío. */
  seasonId: string | null;
}

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY) private readonly laps: LapTimeRepositoryPort,
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
  ) {}

  async execute(
    slug: string,
    userId: string,
    limit: number,
    /** Explícita: ver el ranking de una temporada concreta (pasada o
     *  actual). Omitida: la temporada abierta ahora mismo, o sin acotar si
     *  no hay ninguna. */
    seasonId?: string,
  ): Promise<LeaderboardResult> {
    const track = await this.tracks.findBySlug(slug);
    if (track === null) throw new TrackNotFoundError(slug);

    const resolvedSeasonId = await this.resolveSeasonId(seasonId);

    // Siempre se devuelve la posición propia aunque el jugador no esté en el
    // top: saber que vas el 412º es lo que engancha a bajar a 411.
    const [entries, yourPosition] = await Promise.all([
      this.laps.leaderboard(track.id, limit, resolvedSeasonId),
      this.laps.positionOf(track.id, userId, resolvedSeasonId),
    ]);

    return { entries, yourPosition, seasonId: resolvedSeasonId };
  }

  private async resolveSeasonId(
    requested: string | undefined,
  ): Promise<string | null> {
    if (requested !== undefined) {
      const season = await this.seasons.findById(requested);
      if (season === null) throw new SeasonNotFoundError(requested);
      return season.id;
    }

    const current = await this.seasons.findCurrent();
    return current?.id ?? null;
  }
}
