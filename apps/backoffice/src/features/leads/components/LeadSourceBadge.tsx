import { Badge } from '@/components/ui/badge';
import { LEAD_SOURCE_LABELS, type LeadSource } from '../types';

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  return (
    <Badge variant="outline" className="font-normal">
      {LEAD_SOURCE_LABELS[source]}
    </Badge>
  );
}
