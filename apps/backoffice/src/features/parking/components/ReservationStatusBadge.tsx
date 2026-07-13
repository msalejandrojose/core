import { Badge } from '@/components/ui/badge';
import { RESERVATION_STATUS_LABELS, type ReservationStatus } from '../types';

const VARIANT: Record<ReservationStatus, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge variant={VARIANT[status]}>{RESERVATION_STATUS_LABELS[status]}</Badge>;
}
