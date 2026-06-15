import { DomainError } from './domain-error';

export class EmailNotVerifiedError extends DomainError {
  constructor() {
    super('EMAIL_NOT_VERIFIED', 'El email no ha sido verificado aún.');
  }
}
