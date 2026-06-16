import { DomainError } from '../../../../shared/errors/domain-error';

export class MailDeliveryError extends DomainError {
  constructor(cause?: unknown) {
    super(
      'MAIL_PROVIDER_UNAVAILABLE',
      'No se pudo enviar el correo. Inténtalo más tarde.',
    );
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
