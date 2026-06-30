import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';

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
      <RowActions viewHref={`/users/${row.original.id}`} editHref={`/users/${row.original.id}`} />
    ),
  },
];
