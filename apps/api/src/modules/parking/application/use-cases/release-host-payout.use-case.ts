import { Inject, Injectable } from '@nestjs/common';
import { Payment } from '../../domain/entities/payment.entity';
import { HostPayoutNotEligibleError } from '../../domain/errors/host-payout-not-eligible.error';
import { PaymentNotFoundError } from '../../domain/errors/payment-not-found.error';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryPort,
} from '../ports/payment-repository.port';

/**
 * Backoffice: marca como liquidada al host su parte (`hostPayoutAmount`) de
 * un pago ya cobrado. No mueve dinero de verdad — es un registro de que la
 * transferencia se hizo por fuera del sistema (ver `domain/commission.ts`).
 */
@Injectable()
export class ReleaseHostPayoutUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(paymentId: string): Promise<Payment> {
    const payment = await this.payments.findById(paymentId);
    if (!payment) throw new PaymentNotFoundError(paymentId);

    if (payment.status !== 'PAID' || payment.hostPayoutStatus !== 'PENDING') {
      throw new HostPayoutNotEligibleError(paymentId);
    }

    return this.payments.update(paymentId, {
      hostPayoutStatus: 'RELEASED',
      hostPayoutReleasedAt: new Date(),
    });
  }
}
