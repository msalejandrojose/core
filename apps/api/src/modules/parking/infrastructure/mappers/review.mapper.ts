import type { ReviewAuthorRole } from '@core/shared-types';
import type { Review } from '../../domain/entities/review.entity';

export interface ReviewRow {
  id: string;
  reservationId: string;
  authorUserId: string;
  authorRole: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export function toReviewDomain(row: ReviewRow): Review {
  return {
    id: row.id,
    reservationId: row.reservationId,
    authorUserId: row.authorUserId,
    authorRole: row.authorRole as ReviewAuthorRole,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt,
  };
}
