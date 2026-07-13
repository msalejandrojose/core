import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { RowActions } from '@/components/data-table/RowActions';
import { ParkingStatusBadge } from './components/ParkingStatusBadge';
import type { ParkingRow } from './types';

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' });

export const columns: ColumnDef<ParkingRow>[] = [
  {
    accessorKey: 'title',
    header: 'Plaza',
    cell: ({ row }) => (
      <Link
        to={`/parking/parkings/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'address',
    header: 'Dirección',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.address}</span>
    ),
  },
  {
    accessorKey: 'pricePerDay',
    header: 'Precio / día',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.pricePerDay}€</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <ParkingStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Alta',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {dateFmt(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => (
      <RowActions viewHref={`/parking/parkings/${row.original.id}`} />
    ),
  },
];
