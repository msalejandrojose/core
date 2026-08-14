import type { ColumnDef } from '@tanstack/react-table';
import { Ban } from 'lucide-react';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdminLapTimeRow } from '../types';
import { useInvalidateLapTime } from './hooks/use-invalidate-lap-time';

// Mismo formato que `format_ms` en el HUD del juego (race_hud.gd):
// "1:07.482", con ceros a la izquierda en segundos y milisegundos.
function formatDurationMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export const columns: ColumnDef<AdminLapTimeRow>[] = [
  {
    accessorKey: 'userDisplayName',
    header: 'Jugador',
    cell: ({ row }) => (
      <div>
        <div>{row.original.userDisplayName}</div>
        <div className="text-muted-foreground text-xs">
          {row.original.userEmail}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'trackName',
    header: 'Circuito',
    cell: ({ row }) => (
      <div>
        <div>{row.original.trackName}</div>
        <div className="text-muted-foreground font-mono text-xs">
          {row.original.trackSlug}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'durationMs',
    header: 'Tiempo',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatDurationMs(row.original.durationMs)}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleString('es-ES'),
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      if (row.original.invalidatedAt) {
        return <Badge variant="destructive">Anulado</Badge>;
      }
      if (row.original.isPersonalBest) {
        return <Badge>Mejor marca</Badge>;
      }
      return <Badge variant="secondary">Válido</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <LapTimeRowActions lapTime={row.original} />,
  },
];

function LapTimeRowActions({ lapTime }: { lapTime: AdminLapTimeRow }) {
  const invalidate = useInvalidateLapTime();

  if (lapTime.invalidatedAt) {
    return null;
  }

  return (
    <RowActions
      extra={
        <ConfirmDialog
          title="¿Anular este tiempo?"
          description="No se borra: queda constancia, pero sale del leaderboard, la posición y la mejor marca personal."
          onConfirm={() => invalidate.mutate(lapTime.id)}
          isPending={invalidate.isPending}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Anular"
              disabled={invalidate.isPending}
            >
              <Ban size={14} />
            </Button>
          }
        />
      }
    />
  );
}
