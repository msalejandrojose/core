import { Badge } from '@/components/ui/badge';
import type { PostStatus } from '../../types';

const STATUS: Record<
  PostStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  DRAFT: { label: 'Borrador', variant: 'secondary' },
  SCHEDULED: { label: 'Programado', variant: 'outline' },
  PUBLISHED: { label: 'Publicado', variant: 'default' },
  ARCHIVED: { label: 'Archivado', variant: 'outline' },
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const { label, variant } = STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
