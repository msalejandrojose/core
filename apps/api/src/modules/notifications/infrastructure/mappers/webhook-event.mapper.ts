import type {
  WebhookEvent,
  WebhookEventStatus,
} from '../../domain/entities/webhook-event.entity';

export interface WebhookEventRow {
  id: string;
  source: string;
  type: string | null;
  payload: unknown;
  signatureValid: boolean;
  status: string;
  result: string | null;
  error: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toWebhookEventDomain(row: WebhookEventRow): WebhookEvent {
  return {
    id: row.id,
    source: row.source,
    type: row.type,
    payload: row.payload,
    signatureValid: row.signatureValid,
    status: row.status as WebhookEventStatus,
    result: row.result,
    error: row.error,
    processedAt: row.processedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
