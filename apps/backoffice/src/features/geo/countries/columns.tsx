import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CountryRow } from '../types';
import { CountryFormDialog } from './CountryFormDialog';
import { useDeleteCountry } from './hooks/use-country-mutations';

export const columns: ColumnDef<CountryRow>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'iso2',
    header: 'ISO',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.iso2} / {row.original.iso3}
      </span>
    ),
  },
  {
    accessorKey: 'phoneCode',
    header: 'Prefijo',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phoneCode ?? '—'}</span>
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
    cell: ({ row }) => <CountryRowActions country={row.original} />,
  },
];

function CountryRowActions({ country }: { country: CountryRow }) {
  const remove = useDeleteCountry();
  return (
    <RowActions
      onDelete={() => remove.mutate(country.id)}
      deleteTitle="¿Eliminar país?"
      deleteDescription="Se borrarán también sus comunidades, provincias, municipios y códigos postales. No se puede deshacer."
      isDeleting={remove.isPending}
      extra={
        <CountryFormDialog
          country={country}
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
