import { DomainError } from '../../../../shared/errors/domain-error';

export class FormResponseDuplicateError extends DomainError {
  constructor() {
    super('FORM_RESPONSE_DUPLICATE', 'Ya has enviado una respuesta a este formulario.');
  }
}
