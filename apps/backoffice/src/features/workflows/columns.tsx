import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { WorkflowDefinitionRow } from './types';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' });

export const columns: ColumnDef<WorkflowDefinitionRow>[] = [
  {
    accessorKey: 'name',
    header: 'Workflow',
    cell: ({ row }) => (
      <Link
        to={`/workflows/${encodeURIComponent(row.original.key)}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'key',
    header: 'Key',
    cell: ({ row }) => (
      <code className="text-muted-foreground text-xs">{row.original.key}</code>
    ),
  },
  {
    accessorKey: 'version',
    header: 'Versión',
    cell: ({ row }) => (
      <span className="tabular-nums">v{row.original.version}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge>Activa</Badge>
      ) : (
        <Badge variant="secondary">Inactiva</Badge>
      ),
  },
  {
    accessorKey: 'triggerCount',
    header: 'Triggers',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.triggerCount}
      </span>
    ),
  },
  {
    accessorKey: 'stepCount',
    header: 'Steps',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.stepCount}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Creada',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
];
