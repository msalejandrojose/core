import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { useDeleteApiSection } from './hooks/use-delete-api-section';
import type { ApiSectionRow } from './types';

export const columns: ColumnDef<ApiSectionRow>[] = [
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => (
      <Link
        to={`/sections/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.description ?? '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <ApiSectionRowActions id={row.original.id} />,
  },
];

function ApiSectionRowActions({ id }: { id: string }) {
  const { mutate: deleteSection, isPending } = useDeleteApiSection();

  return (
    <RowActions
      viewHref={`/sections/${id}`}
      editHref={`/sections/${id}`}
      editState={{ mode: 'edit' }}
      onDelete={() => deleteSection(id)}
      deleteTitle="¿Eliminar sección?"
      deleteDescription="Solo se puede eliminar si ningún rol o usuario tiene permisos sobre ella."
      isDeleting={isPending}
    />
  );
}
