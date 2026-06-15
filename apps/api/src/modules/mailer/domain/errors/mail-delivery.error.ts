export class MailDeliveryError extends Error {
  constructor(cause?: unknown) {
    super('Error al enviar el email.');
    this.name = 'MailDeliveryError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
