import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { SiteEntryWithSite } from '../../domain/entities/site-entry.entity';
import {
  SITE_ENTRY_REPOSITORY,
  type SiteEntryRepositoryPort,
} from '../ports/site-entry-repository.port';
import {
  FOLLOW_REPOSITORY,
  type FollowRepositoryPort,
} from '../ports/follow-repository.port';

export interface GetFeedInput {
  userId: string;
  limit: number;
  cursor?: string;
}

// Sitios visitados y puntuados de la gente que sigues, más recientes
// primero. Las mismas coordenadas sirven tanto para pintar el feed como
// para el mapa — no hace falta un endpoint aparte.
@Injectable()
export class GetFeedUseCase {
  constructor(
    @Inject(SITE_ENTRY_REPOSITORY)
    private readonly siteEntries: SiteEntryRepositoryPort,
    @Inject(FOLLOW_REPOSITORY) private readonly follows: FollowRepositoryPort,
  ) {}

  async execute(input: GetFeedInput): Promise<CursorPage<SiteEntryWithSite>> {
    const followingIds = await this.follows.listFollowingIds(input.userId);
    if (followingIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    return this.siteEntries.listFeed({
      userIds: followingIds,
      limit: input.limit,
      cursor: input.cursor,
    });
  }
}
