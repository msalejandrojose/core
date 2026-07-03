import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { FormStatusBadge } from './components/FormStatusBadge';
import { useDeleteForm } from './hooks/use-delete-form';
import type { FormRow } from './types';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' });

export const columns: ColumnDef<FormRow>[] = [
  {
    accessorKey: 'title',
    header: 'Título',
    cell: ({ row }) => (
      <Link
        to={`/forms/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <FormStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'fieldCount',
    header: 'Campos',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.fieldCount}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Creado',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <FormRowActions id={row.original.id} />,
  },
];

function FormRowActions({ id }: { id: string }) {
  const { mutate: deleteForm, isPending } = useDeleteForm();

  return (
    <RowActions
      viewHref={`/forms/${id}`}
      editHref={`/forms/${id}`}
      editState={{ mode: 'edit' }}
      onDelete={() => deleteForm(id)}
      deleteTitle="¿Eliminar formulario?"
      deleteDescription="Se eliminarán también sus enlaces y respuestas. Esta acción no se puede deshacer."
      isDeleting={isPending}
    />
  );
}
