import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Reservation } from '../../domain/entities/reservation.entity';
import {
  RESERVATION_REPOSITORY,
  type ListHostReservationsOptions,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

/** Reservas recibidas sobre mis plazas como host. */
@Injectable()
export class ListHostReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
  ) {}

  execute(opts: ListHostReservationsOptions): Promise<CursorPage<Reservation>> {
    return this.reservations.listForHost(opts);
  }
}
