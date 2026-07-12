import { Inject, Injectable } from '@nestjs/common';
import { RankingOutOfSyncError } from '../../domain/errors/ranking-out-of-sync.error';
import { bandFor, Sentiment } from '../../domain/ranking/sentiment-band';
import {
  advance,
  InsertionRange,
  nextStep,
} from '../../domain/ranking/insertion-stepper';
import {
  SITE_ENTRY_REPOSITORY,
  type SiteEntryRepositoryPort,
} from '../ports/site-entry-repository.port';
import {
  COMPARISON_REPOSITORY,
  type ComparisonRepositoryPort,
} from '../ports/comparison-repository.port';
import { resolveRatingStep, RatingStepResult } from './rating-flow.helper';

export interface AnswerRatingComparisonInput {
  userId: string;
  siteId: string;
  sentiment: Sentiment;
  lo: number;
  hi: number;
  compareWithSiteId: string;
  newSiteIsBetter: boolean;
}

// Recibe la respuesta a UNA comparación del flujo de StartRatingUseCase y
// avanza la búsqueda binaria un paso. Sin estado en servidor: recalcula el
// bucket fresco cada vez y valida que el sitio de comparación que dice
// haber visto el cliente sigue en la posición esperada (si no, el bucket
// cambió entre medias — se le pide reiniciar el flujo).
@Injectable()
export class AnswerRatingComparisonUseCase {
  constructor(
    @Inject(SITE_ENTRY_REPOSITORY)
    private readonly siteEntries: SiteEntryRepositoryPort,
    @Inject(COMPARISON_REPOSITORY)
    private readonly comparisons: ComparisonRepositoryPort,
  ) {}

  async execute(input: AnswerRatingComparisonInput): Promise<RatingStepResult> {
    const entry = await this.siteEntries.findByUserAndSite(
      input.userId,
      input.siteId,
    );
    if (!entry || entry.status !== 'VISITED' || entry.score !== null) {
      throw new RankingOutOfSyncError(input.siteId);
    }

    const band = bandFor(input.sentiment);
    const bucket = await this.siteEntries.listRankedBucket(
      input.userId,
      band,
      entry.id,
    );

    const range: InsertionRange = { lo: input.lo, hi: input.hi };
    const step = nextStep(range);
    if (step.done || bucket[step.compareIndex]?.siteId !== input.compareWithSiteId) {
      throw new RankingOutOfSyncError(input.siteId);
    }

    await this.comparisons.create({
      userId: input.userId,
      winnerEntryId: input.newSiteIsBetter ? entry.id : bucket[step.compareIndex].id,
      loserEntryId: input.newSiteIsBetter ? bucket[step.compareIndex].id : entry.id,
    });

    const newRange = advance(range, step.compareIndex, input.newSiteIsBetter);
    return resolveRatingStep(bucket, newRange, band, entry, this.siteEntries);
  }
}
