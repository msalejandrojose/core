import { DomainError } from '../../../../shared/errors/domain-error';

export class WebhookEventNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'WEBHOOK_EVENT_NOT_FOUND',
      `Evento de webhook "${id}" no encontrado.`,
      { id },
    );
  }
}
