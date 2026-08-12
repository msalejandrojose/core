import { Badge } from '@/components/ui/badge';
import { WEBHOOK_EVENT_STATUS_LABELS, type WebhookEventStatus } from '../types';

const VARIANT: Record<
  WebhookEventStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  pending: 'secondary',
  processed: 'default',
  failed: 'destructive',
};

export function WebhookEventStatusBadge({
  status,
}: {
  status: WebhookEventStatus;
}) {
  return (
    <Badge variant={VARIANT[status]}>{WEBHOOK_EVENT_STATUS_LABELS[status]}</Badge>
  );
}
