import { Inject, Injectable } from '@nestjs/common';
import type { WebhookEvent } from '../../domain/entities/webhook-event.entity';
import { WebhookEventNotFoundError } from '../../domain/errors/webhook-event-not-found.error';
import {
  WEBHOOK_EVENT_REPOSITORY,
  type WebhookEventRepositoryPort,
} from '../ports/webhook-event-repository.port';

@Injectable()
export class GetWebhookEventUseCase {
  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly events: WebhookEventRepositoryPort,
  ) {}

  async execute(id: string): Promise<WebhookEvent> {
    const event = await this.events.findById(id);
    if (!event) throw new WebhookEventNotFoundError(id);
    return event;
  }
}
