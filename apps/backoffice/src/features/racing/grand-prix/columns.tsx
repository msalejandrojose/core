import type { ColumnDef } from '@tanstack/react-table';
import { Power, PowerOff } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GrandPrixRow } from '../types';
import { useUpdateGrandPrix } from './hooks/use-update-grand-prix';

export const columns: ColumnDef<GrandPrixRow>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.slug}</span>
    ),
  },
  {
    id: 'stages',
    header: 'Circuitos',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.stages.length}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge>Activo</Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <GrandPrixRowActions grandPrix={row.original} />,
  },
];

function GrandPrixRowActions({ grandPrix }: { grandPrix: GrandPrixRow }) {
  const update = useUpdateGrandPrix(grandPrix.id);
  return (
    <RowActions
      editHref={`/racing/grand-prix/${grandPrix.id}`}
      extra={
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={grandPrix.isActive ? 'Desactivar' : 'Activar'}
          disabled={update.isPending}
          onClick={() => update.mutate({ isActive: !grandPrix.isActive })}
        >
          {grandPrix.isActive ? <PowerOff size={14} /> : <Power size={14} />}
        </Button>
      }
    />
  );
}
