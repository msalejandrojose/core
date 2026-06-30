import { DomainError } from '../../../../shared/errors/domain-error';

export class FormNotFoundError extends DomainError {
  constructor(id: string) {
    super('FORM_NOT_FOUND', `Formulario ${id} no encontrado.`, { id });
  }
}
