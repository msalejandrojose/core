import { Badge } from '@/components/ui/badge';
import { LEAD_STATUS_LABELS, type LeadStatus } from '../types';

const VARIANT: Record<
  LeadStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  NEW: 'secondary',
  CONTACTED: 'outline',
  QUALIFIED: 'default',
  PROPOSAL: 'default',
  WON: 'default',
  LOST: 'destructive',
  UNQUALIFIED: 'outline',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={VARIANT[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;
}
