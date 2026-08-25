import type { ColumnDef } from '@tanstack/react-table';
import { Power, PowerOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TrackRow } from '../types';
import { TrackFormDialog } from './components/TrackFormDialog';
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
    id: 'circuit',
    header: 'Circuito',
    cell: ({ row }) => (
      <Link
        to={`/racing/circuits/${row.original.circuitId}`}
        className="text-primary hover:underline"
      >
        {row.original.circuitName}
      </Link>
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
  const update = useUpdateTrack(track.id);
  return (
    <RowActions
      editTrigger={<TrackFormDialog track={track} />}
      extra={
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={track.isActive ? 'Desactivar' : 'Activar'}
          disabled={update.isPending}
          onClick={() => update.mutate({ isActive: !track.isActive })}
        >
          {track.isActive ? <PowerOff size={14} /> : <Power size={14} />}
        </Button>
      }
    />
  );
}
