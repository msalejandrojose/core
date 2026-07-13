import { Badge } from '@/components/ui/badge';
import { HOST_VERIFICATION_STATUS_LABELS, type HostVerificationStatus } from '../types';

const VARIANT: Record<HostVerificationStatus, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

export function HostVerificationStatusBadge({ status }: { status: HostVerificationStatus }) {
  return <Badge variant={VARIANT[status]}>{HOST_VERIFICATION_STATUS_LABELS[status]}</Badge>;
}
