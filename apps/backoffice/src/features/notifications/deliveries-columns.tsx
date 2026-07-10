import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { DeliveryStatusBadge } from './components/DeliveryStatusBadge';
import { CHANNEL_LABELS, type Delivery } from './types';

export const deliveryColumns: ColumnDef<Delivery>[] = [
  {
    accessorKey: 'channel',
    header: 'Canal',
    cell: ({ row }) => (
      <Badge variant="secondary">{CHANNEL_LABELS[row.original.channel]}</Badge>
    ),
  },
  {
    accessorKey: 'provider',
    header: 'Proveedor',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.provider}
      </span>
    ),
  },
  {
    accessorKey: 'to',
    header: 'Destinatario',
    cell: ({ row }) => (
      <Link
        to={`/notifications/deliveries/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.to}
      </Link>
    ),
  },
  {
    accessorKey: 'messageTypeKey',
    header: 'Tipo de mensaje',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.messageTypeKey}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <DeliveryStatusBadge status={row.original.status} />,
  },
  {
    id: 'lastEventAt',
    header: 'Último evento',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {row.original.lastEventAt
          ? new Date(row.original.lastEventAt).toLocaleString('es-ES')
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Enviado',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {new Date(row.original.createdAt).toLocaleString('es-ES')}
      </span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => (
      <RowActions viewHref={`/notifications/deliveries/${row.original.id}`} />
    ),
  },
];
