import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import type { PostalCodeRow } from '../types';
import { PostalCodeFormDialog } from './PostalCodeFormDialog';
import { useDeletePostalCode } from './hooks/use-postal-code-mutations';

export function makeColumns(
  municipalityNameById: Map<string, string>,
): ColumnDef<PostalCodeRow>[] {
  return [
    {
      accessorKey: 'code',
      header: 'Código postal',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      accessorKey: 'municipalityId',
      header: 'Municipio',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {municipalityNameById.get(row.original.municipalityId) ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => <PostalCodeRowActions postalCode={row.original} />,
    },
  ];
}

function PostalCodeRowActions({ postalCode }: { postalCode: PostalCodeRow }) {
  const remove = useDeletePostalCode();
  return (
    <RowActions
      onDelete={() => remove.mutate(postalCode.id)}
      deleteTitle="¿Eliminar código postal?"
      deleteDescription="No se puede deshacer."
      isDeleting={remove.isPending}
      extra={
        <PostalCodeFormDialog
          postalCode={postalCode}
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
