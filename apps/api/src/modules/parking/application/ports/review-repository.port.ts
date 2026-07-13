import type { ReviewAuthorRole } from '@core/shared-types';
import { CursorPage } from '../../../../shared/pagination';
import type { Review } from '../../domain/entities/review.entity';

export const REVIEW_REPOSITORY = Symbol('PARKING_REVIEW_REPOSITORY');

export interface CreateReviewData {
  reservationId: string;
  authorUserId: string;
  authorRole: ReviewAuthorRole;
  rating: number;
  comment: string | null;
}

export interface ListParkingReviewsOptions {
  parkingId: string;
  limit: number;
  cursor?: string;
}

export interface ListAllReviewsOptions {
  limit: number;
  cursor?: string;
  parkingId?: string;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface ReviewRepositoryPort {
  create(data: CreateReviewData): Promise<Review>;
  findById(id: string): Promise<Review | null>;
  findByReservationAndRole(
    reservationId: string,
    authorRole: ReviewAuthorRole,
  ): Promise<Review | null>;
  listForReservation(reservationId: string): Promise<Review[]>;
  /** Reseñas `GUEST` (sobre la plaza/host) de una plaza, para el buscador/ficha públicos. */
  listForParking(opts: ListParkingReviewsOptions): Promise<CursorPage<Review>>;
  /** Media y nº de reseñas `GUEST` de una plaza. `average: null` si no tiene ninguna. */
  getParkingRatingSummary(parkingId: string): Promise<RatingSummary>;
  /** Backoffice: todas las reseñas, para moderación. */
  listAll(opts: ListAllReviewsOptions): Promise<CursorPage<Review>>;
  delete(id: string): Promise<void>;
}
