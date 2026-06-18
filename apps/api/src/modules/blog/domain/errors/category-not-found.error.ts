import { DomainError } from '../../../../shared/errors/domain-error';

export class CategoryNotFoundError extends DomainError {
  constructor(id: string) {
    super('CATEGORY_NOT_FOUND', `Categoría "${id}" no encontrada.`, { id });
  }
}
