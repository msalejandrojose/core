import { DomainError } from '../../../../shared/errors/domain-error';

export class NotificationDeliveryError extends DomainError {
  constructor(channel: string, cause: unknown) {
    super(
      'NOTIFICATION_DELIVERY_FAILED',
      `Fallo al entregar la notificación por ${channel}.`,
      { channel, cause: String(cause) },
    );
  }
}
