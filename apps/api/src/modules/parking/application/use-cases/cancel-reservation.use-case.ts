import { Inject, Injectable } from '@nestjs/common';
import { canTransitionReservationStatus } from '@core/shared-types';
import { Reservation } from '../../domain/entities/reservation.entity';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import { InvalidReservationStatusTransitionError } from '../../domain/errors/invalid-reservation-status-transition.error';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

/** Cancela una reserva. La puede cancelar tanto el guest como el host de la plaza. */
@Injectable()
export class CancelReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
  ) {}

  async execute(id: string, actorUserId: string): Promise<Reservation> {
    const reservation = await this.reservations.findByIdForParticipant(
      id,
      actorUserId,
    );
    if (!reservation) throw new ReservationNotFoundError(id);

    if (!canTransitionReservationStatus(reservation.status, 'CANCELLED')) {
      throw new InvalidReservationStatusTransitionError(
        reservation.status,
        'CANCELLED',
      );
    }

    return this.reservations.updateStatus(id, 'CANCELLED');
  }
}
