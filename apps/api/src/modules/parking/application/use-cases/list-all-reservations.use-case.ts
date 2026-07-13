import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Reservation } from '../../domain/entities/reservation.entity';
import {
  RESERVATION_REPOSITORY,
  type ListAllReservationsOptions,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

/** Backoffice: todas las reservas, de cualquier guest/host (soporte y moderación). */
@Injectable()
export class ListAllReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
  ) {}

  execute(opts: ListAllReservationsOptions): Promise<CursorPage<Reservation>> {
    return this.reservations.listAll(opts);
  }
}
