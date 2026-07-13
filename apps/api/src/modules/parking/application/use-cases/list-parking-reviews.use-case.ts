import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Review } from '../../domain/entities/review.entity';
import {
  REVIEW_REPOSITORY,
  type ReviewRepositoryPort,
  type ListParkingReviewsOptions,
} from '../ports/review-repository.port';

/** Buscador/ficha públicos: reseñas del guest sobre una plaza (host). */
@Injectable()
export class ListParkingReviewsUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepositoryPort,
  ) {}

  async execute(opts: ListParkingReviewsOptions): Promise<CursorPage<Review>> {
    return this.reviews.listForParking(opts);
  }
}
