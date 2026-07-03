import { Badge } from '@/components/ui/badge';
import { FORM_STATUS_LABELS, type FormStatus } from '../types';

const VARIANT: Record<FormStatus, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'outline',
  PUBLISHED: 'default',
  ARCHIVED: 'secondary',
};

export function FormStatusBadge({ status }: { status: FormStatus }) {
  return <Badge variant={VARIANT[status]}>{FORM_STATUS_LABELS[status]}</Badge>;
}
