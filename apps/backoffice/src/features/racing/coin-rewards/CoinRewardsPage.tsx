import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from './columns';
import { useCoinRewardConfigs } from './hooks/use-coin-reward-configs';

export function CoinRewardsPage() {
  const { data, isLoading, isError, refetch } = useCoinRewardConfigs();
  const rows = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monedas y bonos"
        description="Importes de la economía de monedas — posición en carrera, anuncio recompensado, récord personal, batir a un amigo y racha de victorias. Editable sin desplegar el juego; 0 desactiva un bono."
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
        emptyMessage="No hay bonos configurados"
      />
    </div>
  );
}
