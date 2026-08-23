import type { ColumnDef } from '@tanstack/react-table';
import { ImageOff, Power, PowerOff } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TRACK_THEME_LABELS, type CircuitRow } from '../types';
import { useUpdateCircuit } from './hooks/use-update-circuit';
import { resolveCircuitImageUrl } from './lib/circuit-image-url';

export const columns: ColumnDef<CircuitRow>[] = [
  {
    id: 'image',
    header: '',
    cell: ({ row }) => {
      const url = resolveCircuitImageUrl(row.original.imageUrl);
      return (
        <div className="bg-muted flex size-10 items-center justify-center overflow-hidden rounded">
          {url ? (
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff size={16} className="text-muted-foreground" />
          )}
        </div>
      );
    },
  },
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.slug}</span>
    ),
  },
  {
    accessorKey: 'theme',
    header: 'Tema',
    cell: ({ row }) => (
      <Badge variant="outline">{TRACK_THEME_LABELS[row.original.theme]}</Badge>
    ),
  },
  {
    accessorKey: 'grip',
    header: 'Agarre',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.grip.toFixed(2)}</span>
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
    accessorKey: 'isInRotation',
    header: 'Rotación',
    cell: ({ row }) =>
      row.original.isInRotation ? (
        <Badge variant="outline" className="border-green-600 text-green-700">
          En rotación hoy
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Fuera de rotación
        </Badge>
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CircuitRowActions circuit={row.original} />,
  },
];

function CircuitRowActions({ circuit }: { circuit: CircuitRow }) {
  const update = useUpdateCircuit(circuit.id);
  return (
    <RowActions
      editHref={`/racing/circuits/${circuit.id}`}
      extra={
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={circuit.isActive ? 'Desactivar' : 'Activar'}
          disabled={update.isPending}
          onClick={() => update.mutate({ isActive: !circuit.isActive })}
        >
          {circuit.isActive ? <PowerOff size={14} /> : <Power size={14} />}
        </Button>
      }
    />
  );
}
