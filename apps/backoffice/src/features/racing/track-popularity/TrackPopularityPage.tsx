import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from './columns';
import { useTrackPopularity } from './hooks/use-track-popularity';

export function TrackPopularityPage() {
  const { data, isLoading, isError, refetch } = useTrackPopularity();
  const rows = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Popularidad de circuitos"
        description="Qué circuitos se juegan y cuáles se abandonan: vueltas totales, jugadores distintos, y la tendencia de los últimos 30 días frente a los 30 anteriores."
      />
      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        pagination={{
          mode: 'offset',
          pagination: { page: 1, limit: rows.length || 1, total: rows.length, totalPages: 1 },
          onPageChange: () => {},
          onLimitChange: () => {},
        }}
        emptyMessage="Todavía no hay ningún circuito"
      />
    </div>
  );
}
