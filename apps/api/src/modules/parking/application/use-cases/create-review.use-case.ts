import { Inject, Injectable } from '@nestjs/common';
import { isReservationReviewable } from '../../domain/review-eligibility';
import { Review } from '../../domain/entities/review.entity';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import { ReviewAlreadyExistsError } from '../../domain/errors/review-already-exists.error';
import { ReviewNotEligibleError } from '../../domain/errors/review-not-eligible.error';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';
import {
  REVIEW_REPOSITORY,
  type ReviewRepositoryPort,
} from '../ports/review-repository.port';

export interface CreateReviewInput {
  reservationId: string;
  authorUserId: string;
  rating: number;
  comment: string | null;
}

/**
 * Reseña bidireccional tras la estancia (TASK-154): el guest valora la plaza
 * (host), el host valora al guest. `authorUserId` determina el rol —
 * `findByIdForParticipant` ya garantiza que solo puede ser el guest o el
 * host de la plaza reservada. Máximo una reseña por rol y reserva.
 */
@Injectable()
export class CreateReviewUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
    @Inject(REVIEW_REPOSITORY)
    private readonly reviews: ReviewRepositoryPort,
  ) {}

  async execute(input: CreateReviewInput): Promise<Review> {
    const { reservationId, authorUserId, rating, comment } = input;

    const reservation = await this.reservations.findByIdForParticipant(
      reservationId,
      authorUserId,
    );
    if (!reservation) throw new ReservationNotFoundError(reservationId);

    if (!isReservationReviewable(reservation)) {
      throw new ReviewNotEligibleError(reservationId);
    }

    const authorRole =
      authorUserId === reservation.guestUserId ? 'GUEST' : 'HOST';

    const existing = await this.reviews.findByReservationAndRole(
      reservationId,
      authorRole,
    );
    if (existing) throw new ReviewAlreadyExistsError(reservationId);

    return this.reviews.create({
      reservationId,
      authorUserId,
      authorRole,
      rating,
      comment,
    });
  }
}
