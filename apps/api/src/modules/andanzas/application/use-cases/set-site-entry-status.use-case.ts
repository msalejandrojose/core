import { Inject, Injectable } from '@nestjs/common';
import { SiteEntry } from '../../domain/entities/site-entry.entity';
import { SiteEntryStatus } from '../../domain/value-objects/site-entry-status.vo';
import { SiteNotFoundError } from '../../domain/errors/site-not-found.error';
import { InvalidSiteEntryTransitionError } from '../../domain/errors/invalid-site-entry-transition.error';
import { canTransition } from '../../domain/site-entry/status-transition';
import {
  SITE_ENTRY_REPOSITORY,
  type SiteEntryRepositoryPort,
} from '../ports/site-entry-repository.port';
import {
  SITE_REPOSITORY,
  type SiteRepositoryPort,
} from '../ports/site-repository.port';

export interface SetSiteEntryStatusInput {
  userId: string;
  siteId: string;
  status: SiteEntryStatus;
}

// Marca un sitio como "quiero ir" o "ya fui" SIN pasar por el flujo de
// puntuación (ver StartRatingUseCase para eso). Deja `score` en null.
@Injectable()
export class SetSiteEntryStatusUseCase {
  constructor(
    @Inject(SITE_ENTRY_REPOSITORY)
    private readonly siteEntries: SiteEntryRepositoryPort,
    @Inject(SITE_REPOSITORY) private readonly sites: SiteRepositoryPort,
  ) {}

  async execute(input: SetSiteEntryStatusInput): Promise<SiteEntry> {
    const site = await this.sites.findById(input.siteId);
    if (!site) throw new SiteNotFoundError(input.siteId);

    const existing = await this.siteEntries.findByUserAndSite(
      input.userId,
      input.siteId,
    );
    const currentStatus = existing?.status ?? null;
    if (!canTransition(currentStatus, input.status)) {
      throw new InvalidSiteEntryTransitionError(currentStatus, input.status);
    }

    return this.siteEntries.upsertStatus({
      userId: input.userId,
      siteId: input.siteId,
      status: input.status,
    });
  }
}
