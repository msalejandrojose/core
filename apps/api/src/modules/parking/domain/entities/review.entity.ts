import type { ReviewAuthorRole } from '@core/shared-types';

export type { ReviewAuthorRole };

// Reseña bidireccional de una reserva completada: el guest valora la plaza
// (host), o el host valora al guest. Ver `review-eligibility.ts`.
export interface Review {
  id: string;
  reservationId: string;
  authorUserId: string;
  authorRole: ReviewAuthorRole;
  rating: number;
  comment: string | null;
  createdAt: Date;
}
