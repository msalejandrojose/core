import { Inject, Injectable } from '@nestjs/common';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentNotFoundError } from '../../domain/errors/payment-not-found.error';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryPort,
} from '../ports/payment-repository.port';

/** Estado del pago de una reserva, visible tanto al guest como al host (mismo scope que `GetReservationUseCase`). */
@Injectable()
export class GetReservationPaymentUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(reservationId: string, actorUserId: string): Promise<Payment> {
    const reservation = await this.reservations.findByIdForParticipant(
      reservationId,
      actorUserId,
    );
    if (!reservation) throw new ReservationNotFoundError(reservationId);

    const payment = await this.payments.findByReservationId(reservationId);
    if (!payment) throw new PaymentNotFoundError(reservationId);
    return payment;
  }
}
