import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListPlayerRatingsOptions,
  AdminPlayerRatingListEntry,
  PLAYER_RATING_REPOSITORY,
  type PlayerRatingRepositoryPort,
} from '../ports/player-rating-repository.port';

// Ranking de rating para el backoffice (TASK-323, tarea 8) — mismo criterio
// que `AdminListLapTimesUseCase`: paginación offset, sin filtros de
// momento.
@Injectable()
export class AdminListPlayerRatingsUseCase {
  constructor(
    @Inject(PLAYER_RATING_REPOSITORY)
    private readonly ratings: PlayerRatingRepositoryPort,
  ) {}

  execute(
    opts: AdminListPlayerRatingsOptions,
  ): Promise<PaginatedResult<AdminPlayerRatingListEntry>> {
    return this.ratings.listAllAdmin(opts);
  }
}
