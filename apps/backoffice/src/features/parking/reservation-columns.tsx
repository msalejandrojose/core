import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { ReservationStatusBadge } from './components/ReservationStatusBadge';
import type { ReservationRow } from './types';

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' });

export const reservationColumns: ColumnDef<ReservationRow>[] = [
  {
    accessorKey: 'startDate',
    header: 'Entrada',
    cell: ({ row }) => (
      <span className="tabular-nums">{dateFmt(row.original.startDate)}</span>
    ),
  },
  {
    accessorKey: 'endDate',
    header: 'Salida',
    cell: ({ row }) => (
      <span className="tabular-nums">{dateFmt(row.original.endDate)}</span>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Importe',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.totalAmount}€</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <ReservationStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'parkingId',
    header: 'Plaza',
    cell: ({ row }) => (
      <Link
        to={`/parking/parkings/${row.original.parkingId}`}
        className="text-muted-foreground hover:text-foreground hover:underline"
      >
        Ver plaza
      </Link>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Creada',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {dateFmt(row.original.createdAt)}
      </span>
    ),
  },
];
