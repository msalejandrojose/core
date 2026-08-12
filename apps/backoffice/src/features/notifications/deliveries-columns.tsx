import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  CHANNEL_LABELS,
  DELIVERY_STATUS_LABELS,
  type Delivery,
  type DeliveryStatus,
} from './types';

const STATUS_VARIANT: Record<
  DeliveryStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  sent: 'outline',
  deferred: 'secondary',
  delivered: 'default',
  opened: 'default',
  clicked: 'default',
  unsubscribed: 'secondary',
  spam: 'destructive',
  dropped: 'destructive',
  bounced: 'destructive',
  failed: 'destructive',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export const deliveryColumns: ColumnDef<Delivery>[] = [
  {
    accessorKey: 'to',
    header: 'Destinatario',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.to}</span>
    ),
  },
  {
    accessorKey: 'messageTypeKey',
    header: 'Tipo de mensaje',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.messageTypeKey}</span>
    ),
  },
  {
    accessorKey: 'channel',
    header: 'Canal',
    cell: ({ row }) => (
      <Badge variant="secondary">{CHANNEL_LABELS[row.original.channel]}</Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const { status, error } = row.original;
      return (
        <Badge variant={STATUS_VARIANT[status]} title={error ?? undefined}>
          {DELIVERY_STATUS_LABELS[status]}
        </Badge>
      );
    },
  },
  {
    id: 'sentAt',
    header: 'Enviado',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.sentAt)}
      </span>
    ),
  },
];
