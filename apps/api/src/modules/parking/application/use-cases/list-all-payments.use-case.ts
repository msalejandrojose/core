import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Payment } from '../../domain/entities/payment.entity';
import {
  PAYMENT_REPOSITORY,
  type PaymentRepositoryPort,
  type ListAllPaymentsOptions,
} from '../ports/payment-repository.port';

/** Backoffice: todos los pagos, para soporte y liquidación de hosts. */
@Injectable()
export class ListAllPaymentsUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(opts: ListAllPaymentsOptions): Promise<CursorPage<Payment>> {
    return this.payments.listAll(opts);
  }
}
