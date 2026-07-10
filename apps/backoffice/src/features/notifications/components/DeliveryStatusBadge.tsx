import { Badge } from '@/components/ui/badge';
import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from '../types';

const VARIANT: Record<
  DeliveryStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  pending: 'secondary',
  sent: 'outline',
  deferred: 'outline',
  delivered: 'default',
  opened: 'default',
  clicked: 'default',
  unsubscribed: 'secondary',
  spam: 'destructive',
  dropped: 'destructive',
  bounced: 'destructive',
  failed: 'destructive',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge variant={VARIANT[status]}>{DELIVERY_STATUS_LABELS[status]}</Badge>;
}
