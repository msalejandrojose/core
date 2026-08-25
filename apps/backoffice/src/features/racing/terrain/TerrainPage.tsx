import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from './columns';
import { useTerrainEffects } from './hooks/use-terrain-effects';

export function TerrainPage() {
  const { data, isLoading, isError, refetch } = useTerrainEffects();
  const rows = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terreno"
        description="Efecto de cada tipo de terreno de sección (hielo, barro, agua) sobre el agarre y la velocidad punta — editable sin desplegar el juego. Se pinta dónde aparece cada uno desde el editor de circuitos."
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
        emptyMessage="No hay tipos de terreno"
      />
    </div>
  );
}
