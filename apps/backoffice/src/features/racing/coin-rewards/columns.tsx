import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import { COIN_REWARD_KEY_LABELS, type CoinRewardConfigRow } from '../types';
import { CoinRewardConfigFormDialog } from './components/CoinRewardConfigFormDialog';

export const columns: ColumnDef<CoinRewardConfigRow>[] = [
  {
    accessorKey: 'key',
    header: 'Bono',
    cell: ({ row }) => COIN_REWARD_KEY_LABELS[row.original.key],
  },
  {
    accessorKey: 'amount',
    header: 'Monedas',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.amount === 0 ? 'Desactivado' : row.original.amount}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <RowActions
        extra={
          <CoinRewardConfigFormDialog
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
