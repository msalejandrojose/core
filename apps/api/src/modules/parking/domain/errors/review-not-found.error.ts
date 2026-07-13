import { DomainError } from '../../../../shared/errors/domain-error';

export class ReviewNotFoundError extends DomainError {
  constructor(id: string) {
    super('REVIEW_NOT_FOUND', `Reseña ${id} no encontrada.`, { id });
  }
}
