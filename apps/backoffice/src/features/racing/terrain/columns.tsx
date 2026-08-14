import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TERRAIN_LABELS, type TerrainEffectRow } from '../types';
import { TerrainEffectFormDialog } from './components/TerrainEffectFormDialog';

export const columns: ColumnDef<TerrainEffectRow>[] = [
  {
    accessorKey: 'type',
    header: 'Terreno',
    cell: ({ row }) => TERRAIN_LABELS[row.original.type],
  },
  {
    accessorKey: 'grip',
    header: 'Agarre',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.grip.toFixed(2)}</span>
    ),
  },
  {
    accessorKey: 'slowsTopSpeed',
    header: 'Frena la velocidad punta',
    cell: ({ row }) =>
      row.original.slowsTopSpeed ? (
        <Badge>Sí</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <RowActions
        extra={
          <TerrainEffectFormDialog
            effect={row.original}
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
