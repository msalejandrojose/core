import { Inject, Injectable } from '@nestjs/common';
import { canTransitionReservationStatus } from '@core/shared-types';
import { Reservation } from '../../domain/entities/reservation.entity';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import { InvalidReservationStatusTransitionError } from '../../domain/errors/invalid-reservation-status-transition.error';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

/** El host confirma una reserva pendiente sobre una de sus plazas. */
@Injectable()
export class ConfirmReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
  ) {}

  async execute(id: string, hostUserId: string): Promise<Reservation> {
    const reservation = await this.reservations.findByIdForHost(id, hostUserId);
    if (!reservation) throw new ReservationNotFoundError(id);

    if (!canTransitionReservationStatus(reservation.status, 'CONFIRMED')) {
      throw new InvalidReservationStatusTransitionError(
        reservation.status,
        'CONFIRMED',
      );
    }

    return this.reservations.updateStatus(id, 'CONFIRMED');
  }
}
