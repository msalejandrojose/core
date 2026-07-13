import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calculateCommissionSplit } from '../../domain/commission';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import { ReservationNotPayableError } from '../../domain/errors/reservation-not-payable.error';
import {
  PAYMENT_GATEWAY_PORT,
  type PaymentGatewayPort,
} from '../../../payments/application/ports/payment-gateway.port';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryPort,
} from '../ports/payment-repository.port';

export interface ReservationCheckout {
  paymentId: string;
  checkoutUrl: string;
}

const DEFAULT_PLATFORM_FEE_PERCENT = 10;
const CURRENCY = 'eur';

/**
 * Inicia el cobro de una reserva (huésped): crea (o reutiliza si sigue
 * `PENDING`) una sesión de Checkout de Stripe por `reservation.totalAmount` y
 * un `Payment` con el reparto de comisión ya calculado (TASK-153). El pago
 * real se confirma vía webhook (`HandleStripeWebhookUseCase`), no aquí.
 */
@Injectable()
export class CreateReservationCheckoutUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepositoryPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    private readonly config: ConfigService,
  ) {}

  async execute(
    reservationId: string,
    guestUserId: string,
  ): Promise<ReservationCheckout> {
    const reservation = await this.reservations.findByIdForParticipant(
      reservationId,
      guestUserId,
    );
    if (!reservation || reservation.guestUserId !== guestUserId) {
      throw new ReservationNotFoundError(reservationId);
    }
    if (reservation.status === 'CANCELLED') {
      throw new ReservationNotPayableError(reservationId);
    }

    const existing = await this.payments.findByReservationId(reservationId);
    if (existing && existing.status !== 'FAILED') {
      throw new ReservationNotPayableError(reservationId);
    }

    const feePercent =
      this.config.get<number>('PLAZZA_PLATFORM_FEE_PERCENT') ??
      DEFAULT_PLATFORM_FEE_PERCENT;
    const { platformFeeAmount, hostPayoutAmount } = calculateCommissionSplit(
      reservation.totalAmount,
      feePercent,
    );

    const appUrl =
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const successUrl =
      (this.config.get<string>('PLAZZA_CHECKOUT_SUCCESS_URL') ??
        `${appUrl}/plazas?payment=success`) + `&reservationId=${reservationId}`;
    const cancelUrl =
      (this.config.get<string>('PLAZZA_CHECKOUT_CANCEL_URL') ??
        `${appUrl}/plazas?payment=cancelled`) +
      `&reservationId=${reservationId}`;

    const session = await this.gateway.createCheckoutSession({
      amount: reservation.totalAmount,
      currency: CURRENCY,
      successUrl,
      cancelUrl,
      metadata: { reservationId },
    });

    const payment = await this.payments.create({
      reservationId,
      amount: reservation.totalAmount,
      platformFeeAmount,
      hostPayoutAmount,
      provider: 'stripe',
      providerCheckoutSessionId: session.sessionId,
    });

    return { paymentId: payment.id, checkoutUrl: session.url };
  }
}
