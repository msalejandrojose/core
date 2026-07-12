import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { SiteWithTags } from '../../domain/entities/site.entity';
import {
  ListSitesOptions,
  SITE_REPOSITORY,
  type SiteRepositoryPort,
} from '../ports/site-repository.port';

@Injectable()
export class ListSitesUseCase {
  constructor(
    @Inject(SITE_REPOSITORY) private readonly sites: SiteRepositoryPort,
  ) {}

  execute(opts: ListSitesOptions): Promise<CursorPage<SiteWithTags>> {
    return this.sites.list(opts);
  }
}
