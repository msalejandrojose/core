import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CHANNEL_LABELS, type SendingAccountType } from './types';

export const accountTypeColumns: ColumnDef<SendingAccountType>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'key',
    header: 'Key',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.key}</span>
    ),
  },
  {
    accessorKey: 'channel',
    header: 'Canal',
    cell: ({ row }) => (
      <Badge variant="secondary">{CHANNEL_LABELS[row.original.channel]}</Badge>
    ),
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
];
