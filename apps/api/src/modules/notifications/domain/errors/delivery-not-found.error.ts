import { DomainError } from '../../../../shared/errors/domain-error';

export class DeliveryNotFoundError extends DomainError {
  constructor(id: string) {
    super('DELIVERY_NOT_FOUND', `Envío "${id}" no encontrado.`, { id });
  }
}
