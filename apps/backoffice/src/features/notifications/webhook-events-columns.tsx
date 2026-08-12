import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { WebhookEventStatusBadge } from './components/WebhookEventStatusBadge';
import type { WebhookEvent } from './types';

export const webhookEventColumns: ColumnDef<WebhookEvent>[] = [
  {
    accessorKey: 'source',
    header: 'Fuente',
    cell: ({ row }) => (
      <Link
        to={`/notifications/webhooks/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.source}
      </Link>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs">
        {row.original.type ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'signatureValid',
    header: 'Firma',
    cell: ({ row }) => (
      <Badge variant={row.original.signatureValid ? 'outline' : 'destructive'}>
        {row.original.signatureValid ? 'Válida' : 'Inválida'}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <WebhookEventStatusBadge status={row.original.status} />,
  },
  {
    id: 'result',
    header: 'Resultado',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.error ?? row.original.result ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Recibido',
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
      <RowActions viewHref={`/notifications/webhooks/${row.original.id}`} />
    ),
  },
];
