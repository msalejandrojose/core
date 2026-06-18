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
import { useDeactivateUser } from './hooks/use-deactivate-user';
import { useUpdateUser } from './hooks/use-update-user';

export interface UserRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userType: 'BACKOFFICE' | 'APP';
  isActive: boolean;
  createdAt: string;
}

const fullName = (u: Pick<UserRow, 'firstName' | 'lastName'>) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <Link
        to={`/users/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.email}
      </Link>
    ),
  },
  {
    id: 'name',
    header: 'Nombre',
    cell: ({ row }) => fullName(row.original),
  },
  {
    accessorKey: 'userType',
    header: 'Tipo',
    cell: ({ row }) => <Badge variant="outline">{row.original.userType}</Badge>,
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Creado',
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString('es-ES'),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <UserRowActions id={row.original.id} isActive={row.original.isActive} />
    ),
  },
];

function UserRowActions({ id, isActive }: { id: string; isActive: boolean }) {
  const { mutate: deactivate, isPending } = useDeactivateUser(id);
  const { mutate: updateUser, isPending: isReactivating } = useUpdateUser(id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/users/${id}`}>Ver detalle</Link>
        </DropdownMenuItem>
        {isActive && (
          <ConfirmDialog
            trigger={
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => e.preventDefault()}
              >
                Desactivar
              </DropdownMenuItem>
            }
            title="¿Desactivar usuario?"
            description="El usuario no podrá iniciar sesión. Se puede reactivar desde el detalle."
            onConfirm={() => deactivate()}
            isPending={isPending}
            destructiveLabel="Desactivar"
          />
        )}
        {!isActive && (
          <DropdownMenuItem
            disabled={isReactivating}
            onSelect={() => updateUser({ isActive: true })}
          >
            Reactivar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
