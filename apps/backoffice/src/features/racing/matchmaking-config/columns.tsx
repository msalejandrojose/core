import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import { MATCHMAKING_CONFIG_KEY_LABELS, type MatchmakingConfigRow } from '../types';
import { MatchmakingConfigFormDialog } from './components/MatchmakingConfigFormDialog';

export const columns: ColumnDef<MatchmakingConfigRow>[] = [
  {
    accessorKey: 'key',
    header: 'Parámetro',
    cell: ({ row }) => MATCHMAKING_CONFIG_KEY_LABELS[row.original.key],
  },
  {
    accessorKey: 'value',
    header: 'Valor',
    cell: ({ row }) => <span className="tabular-nums">{row.original.value}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <RowActions
        extra={
          <MatchmakingConfigFormDialog
            config={row.original}
            trigger={
              <Button variant="ghost" size="icon" className="size-8" title="Editar">
                <Pencil size={14} />
              </Button>
            }
          />
        }
      />
    ),
  },
];
