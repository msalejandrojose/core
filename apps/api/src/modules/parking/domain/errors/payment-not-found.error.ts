import { DomainError } from '../../../../shared/errors/domain-error';

export class PaymentNotFoundError extends DomainError {
  constructor(id: string) {
    super('PAYMENT_NOT_FOUND', `Pago ${id} no encontrado.`, { id });
  }
}
