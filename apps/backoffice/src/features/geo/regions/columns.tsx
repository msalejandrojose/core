import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import type { RegionRow } from '../types';
import { RegionFormDialog } from './RegionFormDialog';
import { useDeleteRegion } from './hooks/use-region-mutations';

export function makeColumns(
  countryNameById: Map<string, string>,
): ColumnDef<RegionRow>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    { accessorKey: 'name', header: 'Nombre' },
    {
      accessorKey: 'countryId',
      header: 'País',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {countryNameById.get(row.original.countryId) ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => <RegionRowActions region={row.original} />,
    },
  ];
}

function RegionRowActions({ region }: { region: RegionRow }) {
  const remove = useDeleteRegion();
  return (
    <RowActions
      onDelete={() => remove.mutate(region.id)}
      deleteTitle="¿Eliminar comunidad autónoma?"
      deleteDescription="Sus provincias quedarán sin comunidad. No se puede deshacer."
      isDeleting={remove.isPending}
      extra={
        <RegionFormDialog
          region={region}
          trigger={
            <Button variant="ghost" size="icon" className="size-8" title="Editar">
              <Pencil size={14} />
            </Button>
          }
        />
      }
    />
  );
}
