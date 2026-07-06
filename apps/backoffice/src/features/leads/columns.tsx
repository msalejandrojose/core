import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import { EditLeadDialog } from './components/EditLeadDialog';
import { LeadSourceBadge } from './components/LeadSourceBadge';
import { LeadStatusBadge } from './components/LeadStatusBadge';
import { leadDisplayName, type LeadRow } from './types';

const dateFmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : '—';

export const columns: ColumnDef<LeadRow>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => (
      <Link
        to={`/leads/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {leadDisplayName(row.original)}
      </Link>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'company',
    header: 'Empresa',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.company ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <LeadStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'source',
    header: 'Origen',
    cell: ({ row }) => <LeadSourceBadge source={row.original.source} />,
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.score}</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Alta',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {dateFmt(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => (
      <RowActions
        viewHref={`/leads/${row.original.id}`}
        editTrigger={
          <EditLeadDialog
            lead={row.original}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Editar"
              >
                <Pencil size={14} />
              </Button>
            }
          />
        }
      />
    ),
  },
];
