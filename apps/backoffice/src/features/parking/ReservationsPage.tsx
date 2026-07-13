import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { reservationColumns } from './reservation-columns';
import { useReservations } from './hooks/use-reservations';
import {
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABELS,
  type ReservationRow,
  type ReservationStatus,
} from './types';

export function ReservationsPage() {
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<'all' | ReservationStatus>('all');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading, isError, refetch } = useReservations({
    limit,
    cursor: currentCursor,
    status: status === 'all' ? undefined : status,
  });

  const rows: ReservationRow[] = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas"
        description="Visión completa de las reservas de Plazza, para soporte y moderación."
      />
      <DataTable
        data={rows}
        columns={reservationColumns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        pagination={{
          mode: 'cursor',
          limit,
          hasMore: data?.meta.hasMore ?? false,
          hasPrevious: cursors.length > 1,
          onNext: () => {
            const next = data?.meta.nextCursor;
            if (next) setCursors((s) => [...s, next]);
          },
          onPrevious: () =>
            setCursors((s) => (s.length > 1 ? s.slice(0, -1) : s)),
          onLimitChange: (l) => {
            setLimit(l);
            resetPaging();
          },
        }}
        emptyMessage="No hay reservas"
        toolbar={
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as 'all' | ReservationStatus);
              resetPaging();
            }}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {RESERVATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {RESERVATION_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
