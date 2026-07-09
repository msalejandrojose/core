import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountFormDialog } from './components/AccountFormDialog';
import { useDeleteAccount } from './hooks/use-account-mutations';
import { CHANNEL_LABELS, type SendingAccount } from './types';

export const accountColumns: ColumnDef<SendingAccount>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'channel',
    header: 'Canal',
    cell: ({ row }) =>
      row.original.channel ? (
        <Badge variant="secondary">
          {CHANNEL_LABELS[row.original.channel]}
        </Badge>
      ) : (
        '—'
      ),
  },
  {
    accessorKey: 'isDefault',
    header: 'Por defecto',
    cell: ({ row }) =>
      row.original.isDefault ? <Badge>Por defecto</Badge> : null,
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'outline' : 'secondary'}>
        {row.original.isActive ? 'Activa' : 'Inactiva'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <AccountRowActions account={row.original} />,
  },
];

function AccountRowActions({ account }: { account: SendingAccount }) {
  const { mutate: remove, isPending } = useDeleteAccount();
  return (
    <RowActions
      editTrigger={
        <AccountFormDialog
          account={account}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Editar"
            >
              <Pencil size={14} />
            </Button>
          }
        />
      }
      onDelete={() => remove(account.id)}
      deleteTitle="¿Eliminar cuenta de envío?"
      deleteDescription="Solo se puede borrar si no tiene tipos de mensaje asociados."
      isDeleting={isPending}
    />
  );
}
