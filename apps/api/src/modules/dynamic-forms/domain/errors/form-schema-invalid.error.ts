import { DomainError } from '../../../../shared/errors/domain-error';

export class FormSchemaInvalidError extends DomainError {
  constructor(reason: string) {
    super('FORM_SCHEMA_INVALID', `El schema del formulario no es válido: ${reason}`, { reason });
  }
}
