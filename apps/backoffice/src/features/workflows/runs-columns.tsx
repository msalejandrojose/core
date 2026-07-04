import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { RunStatusBadge } from './components/StatusBadges';
import type { WorkflowRunDto } from './types';

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export const runsColumns: ColumnDef<WorkflowRunDto>[] = [
  {
    accessorKey: 'id',
    header: 'Run',
    cell: ({ row }) => (
      <Link
        to={`/workflows/runs/${row.original.id}`}
        className="font-mono text-xs hover:underline"
      >
        {row.original.id.slice(0, 8)}
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <RunStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'currentStepKey',
    header: 'Step actual',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.currentStepKey ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'isDryRun',
    header: 'Modo',
    cell: ({ row }) =>
      row.original.isDryRun ? <Badge variant="outline">simulación</Badge> : null,
  },
  {
    accessorKey: 'startedAt',
    header: 'Inicio',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDateTime(row.original.startedAt)}
      </span>
    ),
  },
  {
    accessorKey: 'finishedAt',
    header: 'Fin',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatDateTime(row.original.finishedAt)}
      </span>
    ),
  },
];
