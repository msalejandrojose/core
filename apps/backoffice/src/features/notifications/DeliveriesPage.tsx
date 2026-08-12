import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { deliveryColumns } from './deliveries-columns';
import { useDeliveries } from './hooks/use-deliveries';

export function DeliveriesPage() {
  const [limit, setLimit] = useState(20);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const currentCursor = cursors[cursors.length - 1];

  const { data, isLoading } = useDeliveries({ limit, cursor: currentCursor });
  const rows = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envíos"
        description="Log de entregabilidad: estado de cada envío por canal y su histórico de eventos del proveedor."
      />
      <DataTable
        data={rows}
        columns={deliveryColumns}
        isLoading={isLoading}
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
        emptyMessage="No hay envíos todavía"
      />
    </div>
  );
}
