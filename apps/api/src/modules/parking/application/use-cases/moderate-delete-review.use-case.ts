import { Inject, Injectable } from '@nestjs/common';
import { ReviewNotFoundError } from '../../domain/errors/review-not-found.error';
import {
  REVIEW_REPOSITORY,
  type ReviewRepositoryPort,
} from '../ports/review-repository.port';

/** Backoffice: elimina una reseña abusiva/inapropiada. */
@Injectable()
export class ModerateDeleteReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepositoryPort,
  ) {}

  async execute(reviewId: string): Promise<void> {
    const review = await this.reviews.findById(reviewId);
    if (!review) throw new ReviewNotFoundError(reviewId);

    await this.reviews.delete(reviewId);
  }
}
