import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { useDeleteRole } from './hooks/use-delete-role';
import type { RoleRow, RoleScope } from './types';

const SCOPE_VARIANT: Record<RoleScope, 'default' | 'secondary' | 'outline'> = {
  BACKOFFICE: 'default',
  APP: 'secondary',
  SHARED: 'outline',
};

export const columns: ColumnDef<RoleRow>[] = [
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/roles/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
  },
  {
    accessorKey: 'scope',
    header: 'Scope',
    enableSorting: false,
    cell: ({ row }) => (
      <Badge variant={SCOPE_VARIANT[row.original.scope] ?? 'outline'}>
        {row.original.scope}
      </Badge>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.description ?? '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => <RoleRowActions id={row.original.id} />,
  },
];

function RoleRowActions({ id }: { id: string }) {
  const { mutate: deleteRole, isPending } = useDeleteRole();

  return (
    <RowActions
      viewHref={`/roles/${id}`}
      editHref={`/roles/${id}`}
      onDelete={() => deleteRole(id)}
      deleteTitle="¿Eliminar rol?"
      deleteDescription="Los usuarios con este rol perderán sus permisos asociados."
      isDeleting={isPending}
    />
  );
}
