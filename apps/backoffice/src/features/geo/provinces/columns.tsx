import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import type { ProvinceRow } from '../types';
import { ProvinceFormDialog } from './ProvinceFormDialog';
import { useDeleteProvince } from './hooks/use-province-mutations';

export function makeColumns(
  countryNameById: Map<string, string>,
  regionNameById: Map<string, string>,
): ColumnDef<ProvinceRow>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    { accessorKey: 'name', header: 'Nombre' },
    {
      accessorKey: 'regionId',
      header: 'Comunidad',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.regionId ? regionNameById.get(row.original.regionId) ?? '—' : '—'}
        </span>
      ),
    },
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
      cell: ({ row }) => <ProvinceRowActions province={row.original} />,
    },
  ];
}

function ProvinceRowActions({ province }: { province: ProvinceRow }) {
  const remove = useDeleteProvince();
  return (
    <RowActions
      onDelete={() => remove.mutate(province.id)}
      deleteTitle="¿Eliminar provincia?"
      deleteDescription="Se borrarán también sus municipios y códigos postales. No se puede deshacer."
      isDeleting={remove.isPending}
      extra={
        <ProvinceFormDialog
          province={province}
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
