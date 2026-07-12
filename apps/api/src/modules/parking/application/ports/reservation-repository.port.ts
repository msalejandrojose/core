import type { ReservationStatus } from '@core/shared-types';
import { CursorPage } from '../../../../shared/pagination';
import { Reservation } from '../../domain/entities/reservation.entity';

export const RESERVATION_REPOSITORY = Symbol('PARKING_RESERVATION_REPOSITORY');

export interface CreateReservationData {
  parkingId: string;
  guestUserId: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
}

export interface ListMyReservationsOptions {
  guestUserId: string;
  limit: number;
  cursor?: string;
  status?: ReservationStatus;
}

export interface ListHostReservationsOptions {
  hostUserId: string;
  limit: number;
  cursor?: string;
  status?: ReservationStatus;
  parkingId?: string;
}

export interface ReservationRepositoryPort {
  create(data: CreateReservationData): Promise<Reservation>;
  updateStatus(id: string, status: ReservationStatus): Promise<Reservation>;
  /** Reserva accesible por cualquiera de sus dos participantes (guest o host de la plaza). */
  findByIdForParticipant(
    id: string,
    userId: string,
  ): Promise<Reservation | null>;
  /** Scoped al host de la plaza reservada (para confirmar). */
  findByIdForHost(id: string, hostUserId: string): Promise<Reservation | null>;
  listMine(opts: ListMyReservationsOptions): Promise<CursorPage<Reservation>>;
  listForHost(
    opts: ListHostReservationsOptions,
  ): Promise<CursorPage<Reservation>>;
  /**
   * Anti-solape: true si el rango [startDate, endDate) se cruza con algún
   * `ParkingAvailabilityBlock` o con alguna reserva en estado
   * `PENDING`/`CONFIRMED` de esa plaza.
   */
  hasOverlap(
    parkingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean>;
}
