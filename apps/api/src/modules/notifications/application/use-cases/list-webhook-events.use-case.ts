import { Inject, Injectable } from '@nestjs/common';
import type { CursorPage } from '../../../../shared/pagination';
import type { WebhookEvent } from '../../domain/entities/webhook-event.entity';
import {
  WEBHOOK_EVENT_REPOSITORY,
  type ListWebhookEventsOptions,
  type WebhookEventRepositoryPort,
} from '../ports/webhook-event-repository.port';

@Injectable()
export class ListWebhookEventsUseCase {
  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly events: WebhookEventRepositoryPort,
  ) {}

  execute(opts: ListWebhookEventsOptions): Promise<CursorPage<WebhookEvent>> {
    return this.events.list(opts);
  }
}
