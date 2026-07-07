import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import type { MunicipalityRow } from '../types';
import { MunicipalityFormDialog } from './MunicipalityFormDialog';
import { useDeleteMunicipality } from './hooks/use-municipality-mutations';

export function makeColumns(
  provinceNameById: Map<string, string>,
): ColumnDef<MunicipalityRow>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código INE',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    { accessorKey: 'name', header: 'Nombre' },
    {
      accessorKey: 'provinceId',
      header: 'Provincia',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {provinceNameById.get(row.original.provinceId) ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => <MunicipalityRowActions municipality={row.original} />,
    },
  ];
}

function MunicipalityRowActions({ municipality }: { municipality: MunicipalityRow }) {
  const remove = useDeleteMunicipality();
  return (
    <RowActions
      onDelete={() => remove.mutate(municipality.id)}
      deleteTitle="¿Eliminar municipio?"
      deleteDescription="Se borrarán también sus códigos postales. No se puede deshacer."
      isDeleting={remove.isPending}
      extra={
        <MunicipalityFormDialog
          municipality={municipality}
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
