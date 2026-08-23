import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Button } from '@/components/ui/button';
import { CIRCUIT_ROTATION_CONFIG_KEY_LABELS, type CircuitRotationConfigRow } from '../types';
import { CircuitRotationConfigFormDialog } from './components/CircuitRotationConfigFormDialog';

export const rotationConfigColumns: ColumnDef<CircuitRotationConfigRow>[] = [
  {
    accessorKey: 'key',
    header: 'Parámetro',
    cell: ({ row }) => CIRCUIT_ROTATION_CONFIG_KEY_LABELS[row.original.key],
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
          <CircuitRotationConfigFormDialog
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
