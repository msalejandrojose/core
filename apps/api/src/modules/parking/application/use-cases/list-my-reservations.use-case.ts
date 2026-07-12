import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Reservation } from '../../domain/entities/reservation.entity';
import {
  RESERVATION_REPOSITORY,
  type ListMyReservationsOptions,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

/** Reservas hechas por mí como guest. */
@Injectable()
export class ListMyReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
  ) {}

  execute(opts: ListMyReservationsOptions): Promise<CursorPage<Reservation>> {
    return this.reservations.listMine(opts);
  }
}
