import { Inject, Injectable } from '@nestjs/common';
import { LeaderboardEntry } from '../../domain/entities/lap-time.entity';
import { SeasonNotFoundError } from '../../domain/errors/season-not-found.error';
import { TrackNotFoundError } from '../../domain/errors/track-not-found.error';
import {
  FRIENDSHIP_REPOSITORY,
  type FriendshipRepositoryPort,
} from '../ports/friendship-repository.port';
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

export interface FriendsLeaderboardResult {
  entries: LeaderboardEntry[];
  seasonId: string | null;
}

// Ranking de amigos (TASK-290): el mundial y el de circuito YA existen
// (GetLeaderboardUseCase); esto es el tercero que pedía el documento del
// MVP, acotado a quien juega el jugador Y sus amigos — sin la sensación de
// "página 9 de 40" de un top mundial cuando lo que se quiere es compararse
// con gente conocida.
@Injectable()
export class GetFriendsLeaderboardUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY) private readonly tracks: TrackRepositoryPort,
    @Inject(LAP_TIME_REPOSITORY) private readonly laps: LapTimeRepositoryPort,
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
    @Inject(FRIENDSHIP_REPOSITORY)
    private readonly friendships: FriendshipRepositoryPort,
  ) {}

  async execute(
    slug: string,
    userId: string,
    seasonId?: string,
  ): Promise<FriendsLeaderboardResult> {
    const track = await this.tracks.findBySlug(slug);
    if (track === null) throw new TrackNotFoundError(slug);

    const [friends, resolvedSeasonId] = await Promise.all([
      this.friendships.listFriends(userId),
      this.resolveSeasonId(seasonId),
    ]);

    // El propio jugador entra en su grupo de comparación — un "ranking de
    // amigos" sin ti mismo dentro no dice dónde estás respecto a ellos.
    const userIds = [userId, ...friends.map((f) => f.userId)];

    const entries = await this.laps.leaderboardAmongUsers(
      track.id,
      userIds,
      resolvedSeasonId,
    );

    return { entries, seasonId: resolvedSeasonId };
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
