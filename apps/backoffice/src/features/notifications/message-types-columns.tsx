import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageTypeFormDialog } from './components/MessageTypeFormDialog';
import { useDeleteMessageType } from './hooks/use-message-type-mutations';
import { CHANNEL_LABELS, type MessageType } from './types';

export const messageTypeColumns: ColumnDef<MessageType>[] = [
  {
    accessorKey: 'key',
    header: 'Key',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.key}</span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    id: 'account',
    header: 'Cuenta / canal',
    cell: ({ row }) => {
      const account = row.original.account;
      if (!account) return '—';
      return (
        <span className="text-muted-foreground text-sm">
          {account.name}
          <Badge variant="secondary" className="ml-2">
            {CHANNEL_LABELS[account.channel]}
          </Badge>
        </span>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'outline' : 'secondary'}>
        {row.original.isActive ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <MessageTypeRowActions messageType={row.original} />,
  },
];

function MessageTypeRowActions({ messageType }: { messageType: MessageType }) {
  const { mutate: remove, isPending } = useDeleteMessageType();
  return (
    <RowActions
      editTrigger={
        <MessageTypeFormDialog
          messageType={messageType}
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
      onDelete={() => remove(messageType.id)}
      deleteTitle="¿Eliminar tipo de mensaje?"
      deleteDescription="Esta acción no se puede deshacer."
      isDeleting={isPending}
    />
  );
}
