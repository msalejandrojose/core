import type { ReservationStatus } from '@core/shared-types';

export type { ReservationStatus };

export interface Reservation {
  id: string;
  parkingId: string;
  guestUserId: string;

  startDate: Date;
  endDate: Date;
  totalAmount: number;
  status: ReservationStatus;

  createdAt: Date;
  updatedAt: Date;
}
