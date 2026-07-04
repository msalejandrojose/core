import type { ColumnDef } from '@tanstack/react-table';
import type { WorkflowEventDto } from './types';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' });

const preview = (payload: unknown) => {
  if (payload == null) return '—';
  try {
    const json = JSON.stringify(payload);
    return json.length > 60 ? `${json.slice(0, 60)}…` : json;
  } catch {
    return '—';
  }
};

export const eventsColumns: ColumnDef<WorkflowEventDto>[] = [
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => <code className="text-xs">{row.original.type}</code>,
  },
  {
    accessorKey: 'payload',
    header: 'Payload',
    cell: ({ row }) => (
      <code className="text-muted-foreground text-xs">{preview(row.original.payload)}</code>
    ),
  },
  {
    accessorKey: 'correlationId',
    header: 'Correlación',
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs">
        {row.original.correlationId ? row.original.correlationId.slice(0, 8) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'occurredAt',
    header: 'Cuándo',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDateTime(row.original.occurredAt)}
      </span>
    ),
  },
];
