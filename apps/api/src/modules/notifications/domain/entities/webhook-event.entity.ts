export type WebhookEventStatus = 'pending' | 'processed' | 'failed';

export interface WebhookEvent {
  id: string;
  source: string;
  type: string | null;
  payload: unknown;
  signatureValid: boolean;
  status: WebhookEventStatus;
  result: string | null;
  error: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
