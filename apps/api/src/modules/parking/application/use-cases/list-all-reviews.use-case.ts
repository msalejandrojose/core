import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Review } from '../../domain/entities/review.entity';
import {
  REVIEW_REPOSITORY,
  type ReviewRepositoryPort,
  type ListAllReviewsOptions,
} from '../ports/review-repository.port';

/** Backoffice: todas las reseñas, para moderación. */
@Injectable()
export class ListAllReviewsUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepositoryPort,
  ) {}

  async execute(opts: ListAllReviewsOptions): Promise<CursorPage<Review>> {
    return this.reviews.listAll(opts);
  }
}
