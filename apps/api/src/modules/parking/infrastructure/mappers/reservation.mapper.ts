import type { ReservationStatus } from '@core/shared-types';
import { Reservation } from '../../domain/entities/reservation.entity';

interface DecimalLike {
  toNumber(): number;
}

export interface ReservationRow {
  id: string;
  parkingId: string;
  guestUserId: string;
  startDate: Date;
  endDate: Date;
  totalAmount: DecimalLike;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toReservationDomain(row: ReservationRow): Reservation {
  return {
    id: row.id,
    parkingId: row.parkingId,
    guestUserId: row.guestUserId,
    startDate: row.startDate,
    endDate: row.endDate,
    totalAmount: row.totalAmount.toNumber(),
    status: row.status as ReservationStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
