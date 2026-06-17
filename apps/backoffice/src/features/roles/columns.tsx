import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    header: 'Código',
    cell: ({ row }) => (
      <Link
        to={`/roles/${row.original.id}`}
        className="font-mono text-sm font-medium hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'scope',
    header: 'Scope',
    cell: ({ row }) => (
      <Badge variant={SCOPE_VARIANT[row.original.scope] ?? 'outline'}>
        {row.original.scope}
      </Badge>
    ),
  },
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
    cell: ({ row }) => <RoleRowActions id={row.original.id} />,
  },
];

function RoleRowActions({ id }: { id: string }) {
  const { mutate: deleteRole, isPending } = useDeleteRole();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/roles/${id}`}>Ver detalle</Link>
        </DropdownMenuItem>
        <ConfirmDialog
          trigger={
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => e.preventDefault()}
            >
              Eliminar
            </DropdownMenuItem>
          }
          title="¿Eliminar rol?"
          description="Los usuarios con este rol perderán sus permisos asociados."
          onConfirm={() => deleteRole(id)}
          isPending={isPending}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
