import type { ColumnDef } from '@tanstack/react-table';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TrackPopularityRow } from '../types';

function StatusBadge({ row }: { row: TrackPopularityRow }) {
  if (row.totalLaps === 0) {
    return <Badge variant="outline">Nunca jugado</Badge>;
  }
  if (row.lapsLast30d === 0) {
    return <Badge variant="destructive">Abandonado</Badge>;
  }
  return <Badge variant="secondary">En juego</Badge>;
}

// Sube/baja frente a los 30 días anteriores — sin porcentaje cuando el
// punto de partida es 0, sería infinito o indefinido.
function TrendCell({ row }: { row: TrackPopularityRow }) {
  const { lapsLast30d, lapsPrev30d } = row;
  if (lapsLast30d === lapsPrev30d) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1">
        <Minus size={14} /> {lapsLast30d}
      </span>
    );
  }
  const up = lapsLast30d > lapsPrev30d;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? 'text-green-600' : 'text-destructive'}`}>
      {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {lapsLast30d}
    </span>
  );
}

export const columns: ColumnDef<TrackPopularityRow>[] = [
  {
    accessorKey: 'trackName',
    header: 'Circuito',
    cell: ({ row }) => (
      <div>
        <div>{row.original.trackName}</div>
        <div className="text-muted-foreground font-mono text-xs">{row.original.trackSlug}</div>
      </div>
    ),
  },
  {
    id: 'isActive',
    header: 'Circuito',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="secondary">Activo</Badge>
      ) : (
        <Badge variant="outline">Inactivo</Badge>
      ),
  },
  {
    accessorKey: 'totalLaps',
    header: 'Vueltas totales',
    cell: ({ row }) => <span className="tabular-nums">{row.original.totalLaps}</span>,
  },
  {
    accessorKey: 'distinctPlayers',
    header: 'Jugadores distintos',
    cell: ({ row }) => <span className="tabular-nums">{row.original.distinctPlayers}</span>,
  },
  {
    id: 'trend',
    header: 'Últimos 30 días',
    cell: ({ row }) => <TrendCell row={row.original} />,
  },
  {
    accessorKey: 'lastPlayedAt',
    header: 'Última vez jugado',
    cell: ({ row }) =>
      row.original.lastPlayedAt
        ? new Date(row.original.lastPlayedAt).toLocaleDateString('es-ES')
        : 'Nunca',
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge row={row.original} />,
  },
];
