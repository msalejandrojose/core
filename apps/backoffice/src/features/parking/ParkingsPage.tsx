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
import { columns } from './columns';
import { useParkings } from './hooks/use-parkings';
import { PARKING_STATUSES, PARKING_STATUS_LABELS, type ParkingRow, type ParkingStatus } from './types';

export function ParkingsPage() {
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<'all' | ParkingStatus>('all');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading, isError, refetch } = useParkings({
    limit,
    cursor: currentCursor,
    status: status === 'all' ? undefined : status,
  });

  const rows: ParkingRow[] = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plazas"
        description="Modera las plazas publicadas por los hosts."
      />
      <DataTable
        data={rows}
        columns={columns}
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
        emptyMessage="No hay plazas"
        toolbar={
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as 'all' | ParkingStatus);
              resetPaging();
            }}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {PARKING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PARKING_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
