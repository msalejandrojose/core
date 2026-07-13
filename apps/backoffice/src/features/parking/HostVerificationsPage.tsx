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
import { hostVerificationColumns } from './host-verification-columns';
import { useHostVerifications } from './hooks/use-host-verifications';
import {
  HOST_VERIFICATION_STATUSES,
  HOST_VERIFICATION_STATUS_LABELS,
  type HostVerificationRow,
  type HostVerificationStatus,
} from './types';

export function HostVerificationsPage() {
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<'all' | HostVerificationStatus>('PENDING');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading, isError, refetch } = useHostVerifications({
    limit,
    cursor: currentCursor,
    status: status === 'all' ? undefined : status,
  });

  const rows: HostVerificationRow[] = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verificación de hosts"
        description="Revisa el KYC básico: nombre legal + documento de identidad."
      />
      <DataTable
        data={rows}
        columns={hostVerificationColumns}
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
        emptyMessage="No hay solicitudes"
        toolbar={
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as 'all' | HostVerificationStatus);
              resetPaging();
            }}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {HOST_VERIFICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {HOST_VERIFICATION_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
