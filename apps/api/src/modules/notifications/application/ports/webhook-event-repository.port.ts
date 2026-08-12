import type { CursorPage } from '../../../../shared/pagination';
import type {
  WebhookEvent,
  WebhookEventStatus,
} from '../../domain/entities/webhook-event.entity';

export const WEBHOOK_EVENT_REPOSITORY = Symbol(
  'NOTIFICATIONS_WEBHOOK_EVENT_REPOSITORY',
);

export interface CreateWebhookEventData {
  source: string;
  type: string | null;
  payload: unknown;
  signatureValid: boolean;
  status: WebhookEventStatus;
}

export interface UpdateWebhookEventData {
  status?: WebhookEventStatus;
  result?: string | null;
  error?: string | null;
  processedAt?: Date | null;
}

export interface ListWebhookEventsOptions {
  limit: number;
  cursor?: string;
  source?: string;
  status?: WebhookEventStatus;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface WebhookEventRepositoryPort {
  create(data: CreateWebhookEventData): Promise<WebhookEvent>;
  update(id: string, data: UpdateWebhookEventData): Promise<WebhookEvent>;
  findById(id: string): Promise<WebhookEvent | null>;
  list(opts: ListWebhookEventsOptions): Promise<CursorPage<WebhookEvent>>;
}
