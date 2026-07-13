import { Badge } from '@/components/ui/badge';
import { PARKING_STATUS_LABELS, type ParkingStatus } from '../types';

const VARIANT: Record<ParkingStatus, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'outline',
  PUBLISHED: 'default',
  UNPUBLISHED: 'secondary',
};

export function ParkingStatusBadge({ status }: { status: ParkingStatus }) {
  return <Badge variant={VARIANT[status]}>{PARKING_STATUS_LABELS[status]}</Badge>;
}
