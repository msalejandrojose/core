import { Inject, Injectable } from '@nestjs/common';
import { SiteEntry } from '../../domain/entities/site-entry.entity';
import { SiteNotFoundError } from '../../domain/errors/site-not-found.error';
import { SiteEntryAlreadyRatedError } from '../../domain/errors/site-entry-already-rated.error';
import { InvalidSiteEntryTransitionError } from '../../domain/errors/invalid-site-entry-transition.error';
import { canTransition } from '../../domain/site-entry/status-transition';
import { bandFor, Sentiment } from '../../domain/ranking/sentiment-band';
import { initialRange } from '../../domain/ranking/insertion-stepper';
import {
  SITE_ENTRY_REPOSITORY,
  type SiteEntryRepositoryPort,
} from '../ports/site-entry-repository.port';
import {
  SITE_REPOSITORY,
  type SiteRepositoryPort,
} from '../ports/site-repository.port';
import { resolveRatingStep, RatingStepResult } from './rating-flow.helper';

export interface StartRatingInput {
  userId: string;
  siteId: string;
  sentiment: Sentiment;
}

// Arranca (o retoma) el flujo de puntuación por comparación de un sitio:
// lo pasa a VISITED si hace falta y devuelve la primera comparación a
// mostrar, o el score directamente si es el primer sitio de esa banda.
@Injectable()
export class StartRatingUseCase {
  constructor(
    @Inject(SITE_REPOSITORY) private readonly sites: SiteRepositoryPort,
    @Inject(SITE_ENTRY_REPOSITORY)
    private readonly siteEntries: SiteEntryRepositoryPort,
  ) {}

  async execute(input: StartRatingInput): Promise<RatingStepResult> {
    const site = await this.sites.findById(input.siteId);
    if (!site) throw new SiteNotFoundError(input.siteId);

    const existing = await this.siteEntries.findByUserAndSite(
      input.userId,
      input.siteId,
    );
    if (existing && existing.score !== null) {
      throw new SiteEntryAlreadyRatedError(input.siteId);
    }

    const currentStatus = existing?.status ?? null;
    let entry: SiteEntry;
    if (currentStatus === 'VISITED') {
      // Ya estaba "visitado sin puntuar" (TASK-169) — se reutiliza tal cual.
      entry = existing!;
    } else {
      if (!canTransition(currentStatus, 'VISITED')) {
        throw new InvalidSiteEntryTransitionError(currentStatus, 'VISITED');
      }
      entry = await this.siteEntries.upsertStatus({
        userId: input.userId,
        siteId: input.siteId,
        status: 'VISITED',
      });
    }

    const band = bandFor(input.sentiment);
    const bucket = await this.siteEntries.listRankedBucket(
      input.userId,
      band,
      entry.id,
    );
    const range = initialRange(bucket.length);
    return resolveRatingStep(bucket, range, band, entry, this.siteEntries);
  }
}
