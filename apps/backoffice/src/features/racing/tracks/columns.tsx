import type { ColumnDef } from '@tanstack/react-table';
import { Power, PowerOff } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TRACK_THEME_LABELS, type TrackRow } from '../types';
import { useUpdateTrack } from './hooks/use-update-track';

export const columns: ColumnDef<TrackRow>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.slug}</span>
    ),
  },
  {
    accessorKey: 'sectorCount',
    header: 'Sectores',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.sectorCount}</span>
    ),
  },
  {
    accessorKey: 'minPlausibleMs',
    header: 'Mínimo',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {(row.original.minPlausibleMs / 1000).toFixed(1)}s
      </span>
    ),
  },
  {
    id: 'cells',
    header: 'Celdas',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.path.length}
      </span>
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
    id: 'actions',
    cell: ({ row }) => <TrackRowActions track={row.original} />,
  },
];

function TrackRowActions({ track }: { track: TrackRow }) {
  const update = useUpdateTrack();
  return (
    <RowActions
      extra={
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={track.isActive ? 'Desactivar' : 'Activar'}
          disabled={update.isPending}
          onClick={() =>
            update.mutate({ id: track.id, isActive: !track.isActive })
          }
        >
          {track.isActive ? <PowerOff size={14} /> : <Power size={14} />}
        </Button>
      }
    />
  );
}
