import type { ColumnDef } from '@tanstack/react-table';
import type { PlayerRatingRow } from '../types';

// Función y no un array fijo: la posición en el ranking depende de qué
// página se está viendo (`offset` = huecos de páginas anteriores), no solo
// del índice dentro de la página actual.
export function playerRatingsColumns(offset: number): ColumnDef<PlayerRatingRow>[] {
  return [
    {
      id: 'position',
      header: '#',
      cell: ({ row }) => offset + row.index + 1,
    },
    {
      accessorKey: 'userDisplayName',
      header: 'Jugador',
      cell: ({ row }) => (
        <div>
          <div>{row.original.userDisplayName}</div>
          <div className="text-muted-foreground text-xs">{row.original.userEmail}</div>
        </div>
      ),
    },
    {
      accessorKey: 'rating',
      header: 'Rating',
      cell: ({ row }) => <span className="tabular-nums">{row.original.rating}</span>,
    },
  ];
}
