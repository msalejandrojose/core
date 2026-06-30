import { DomainError } from '../../../../shared/errors/domain-error';

export class FormResponseLimitReachedError extends DomainError {
  constructor() {
    super('FORM_RESPONSE_LIMIT_REACHED', 'Este formulario ha alcanzado el número máximo de respuestas.');
  }
}
