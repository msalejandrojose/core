import { Inject, Injectable } from '@nestjs/common';
import type { WebhookEvent } from '../../domain/entities/webhook-event.entity';
import {
  WEBHOOK_EVENT_REPOSITORY,
  type WebhookEventRepositoryPort,
} from '../ports/webhook-event-repository.port';

// Registra cada webhook entrante tal cual llega (antes de intentar
// procesarlo) y luego marca el resultado. Así el payload crudo sobrevive
// aunque el procesamiento falle o la firma sea inválida.
@Injectable()
export class RecordWebhookEventUseCase {
  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly events: WebhookEventRepositoryPort,
  ) {}

  receive(data: {
    source: string;
    type: string | null;
    payload: unknown;
    signatureValid: boolean;
  }): Promise<WebhookEvent> {
    return this.events.create({ ...data, status: 'pending' });
  }

  markProcessed(id: string, result: string): Promise<WebhookEvent> {
    return this.events.update(id, {
      status: 'processed',
      result,
      error: null,
      processedAt: new Date(),
    });
  }

  markFailed(id: string, error: string): Promise<WebhookEvent> {
    return this.events.update(id, {
      status: 'failed',
      error,
      processedAt: new Date(),
    });
  }
}
