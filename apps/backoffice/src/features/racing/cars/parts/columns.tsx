import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power, PowerOff } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CAR_PART_CATEGORY_LABELS, type CarPartRow } from '../../types';
import { PartFormDialog } from './components/PartFormDialog';
import { useUpdatePart } from './hooks/use-part-mutations';

function formatDelta(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

export const columns: ColumnDef<CarPartRow>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.code}</span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => (
      <Badge variant="outline">
        {CAR_PART_CATEGORY_LABELS[row.original.category]}
      </Badge>
    ),
  },
  {
    accessorKey: 'speedScale',
    header: 'Δ velocidad',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatDelta(row.original.speedScale)}</span>
    ),
  },
  {
    accessorKey: 'grip',
    header: 'Δ agarre',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatDelta(row.original.grip)}</span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge>Activo</Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <PartRowActions part={row.original} />,
  },
];

function PartRowActions({ part }: { part: CarPartRow }) {
  const update = useUpdatePart(part.id);
  return (
    <RowActions
      extra={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title={part.isActive ? 'Desactivar' : 'Activar'}
            disabled={update.isPending}
            onClick={() => update.mutate({ isActive: !part.isActive })}
          >
            {part.isActive ? <PowerOff size={14} /> : <Power size={14} />}
          </Button>
          <PartFormDialog
            part={part}
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
        </>
      }
    />
  );
}
