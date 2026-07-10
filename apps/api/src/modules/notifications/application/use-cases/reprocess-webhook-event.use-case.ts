import { Inject, Injectable } from '@nestjs/common';
import type { SendgridEvent } from '../../domain/delivery/sendgrid-event';
import type { WebhookEvent } from '../../domain/entities/webhook-event.entity';
import { WebhookEventNotFoundError } from '../../domain/errors/webhook-event-not-found.error';
import {
  WEBHOOK_EVENT_REPOSITORY,
  type WebhookEventRepositoryPort,
} from '../ports/webhook-event-repository.port';
import { IngestSendgridEventsUseCase } from './ingest-sendgrid-events.use-case';

// Vuelve a procesar el payload crudo persistido de un webhook entrante. El
// "cómo" procesar depende de la fuente; hoy solo hay `sendgrid`, pero cuando
// se añada el webhook de WhatsApp este switch gana un caso más.
@Injectable()
export class ReprocessWebhookEventUseCase {
  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly events: WebhookEventRepositoryPort,
    private readonly ingestSendgrid: IngestSendgridEventsUseCase,
  ) {}

  async execute(id: string): Promise<WebhookEvent> {
    const event = await this.events.findById(id);
    if (!event) throw new WebhookEventNotFoundError(id);

    try {
      const result = await this.process(event);
      return await this.events.update(id, {
        status: 'processed',
        result,
        error: null,
        processedAt: new Date(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      return this.events.update(id, {
        status: 'failed',
        error: message,
        processedAt: new Date(),
      });
    }
  }

  private async process(event: WebhookEvent): Promise<string> {
    switch (event.source) {
      case 'sendgrid': {
        const payload = Array.isArray(event.payload)
          ? (event.payload as SendgridEvent[])
          : [];
        const result = await this.ingestSendgrid.execute(payload);
        return `applied=${result.applied} unmatched=${result.unmatched}`;
      }
      default:
        throw new Error(
          `No hay procesador registrado para la fuente "${event.source}".`,
        );
    }
  }
}
