import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { SiteEntryWithSite } from '../../domain/entities/site-entry.entity';
import {
  ListMySiteEntriesOptions,
  SITE_ENTRY_REPOSITORY,
  type SiteEntryRepositoryPort,
} from '../ports/site-entry-repository.port';

@Injectable()
export class ListMySiteEntriesUseCase {
  constructor(
    @Inject(SITE_ENTRY_REPOSITORY)
    private readonly siteEntries: SiteEntryRepositoryPort,
  ) {}

  execute(opts: ListMySiteEntriesOptions): Promise<CursorPage<SiteEntryWithSite>> {
    return this.siteEntries.listByUser(opts);
  }
}
