import { SiteEntry } from '../../domain/entities/site-entry.entity';
import { deriveScore } from '../../domain/ranking/derive-score';
import { InsertionRange, nextStep } from '../../domain/ranking/insertion-stepper';
import { ScoreBand } from '../../domain/ranking/sentiment-band';
import { type SiteEntryRepositoryPort } from '../ports/site-entry-repository.port';

export type RatingStepResult =
  | { done: true; entry: SiteEntry }
  | { done: false; lo: number; hi: number; compareWithSiteId: string };

// Punto único compartido por StartRatingUseCase y AnswerRatingComparisonUseCase:
// dado el bucket de la banda (ya ordenado mejor→peor, sin la entry que se
// puntúa) y el rango actual de la búsqueda binaria, decide si ya se
// encontró la posición final (y persiste el score) o hay que pedir una
// comparación más.
export async function resolveRatingStep(
  bucket: SiteEntry[],
  range: InsertionRange,
  band: ScoreBand,
  entry: SiteEntry,
  siteEntries: SiteEntryRepositoryPort,
): Promise<RatingStepResult> {
  const step = nextStep(range);
  if (step.done) {
    // El bucket solo contiene VISITED con score no-nulo (lo garantiza la
    // query de listRankedBucket), de ahí el non-null assertion.
    const upper = step.index > 0 ? bucket[step.index - 1].score! : null;
    const lower = step.index < bucket.length ? bucket[step.index].score! : null;
    const score = deriveScore(band, upper, lower);
    const updated = await siteEntries.updateScore(entry.id, score);
    return { done: true, entry: updated };
  }
  return {
    done: false,
    lo: range.lo,
    hi: range.hi,
    compareWithSiteId: bucket[step.compareIndex].siteId,
  };
}
