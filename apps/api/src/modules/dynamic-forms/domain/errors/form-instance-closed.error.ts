import { DomainError } from '../../../../shared/errors/domain-error';

export class FormInstanceClosedError extends DomainError {
  constructor(hash: string) {
    super('FORM_INSTANCE_CLOSED', `El formulario con hash ${hash} ya no está disponible.`, { hash });
  }
}
