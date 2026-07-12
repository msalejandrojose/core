import { Inject, Injectable } from '@nestjs/common';
import { Reservation } from '../../domain/entities/reservation.entity';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

@Injectable()
export class GetReservationUseCase {
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
    return reservation;
  }
}
