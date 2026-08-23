import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { CircuitRow } from '../types';
import { columns } from './columns';
import { useCircuitRotationConfigs } from './hooks/use-circuit-rotation-configs';
import { useCircuits } from './hooks/use-circuits';
import { useRotateCircuits } from './hooks/use-rotate-circuits';
import { rotationConfigColumns } from './rotation-config-columns';

export function CircuitsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useCircuits({
    page,
    limit,
    search: search.trim() || undefined,
  });

  const rotationConfigs = useCircuitRotationConfigs();
  const rotationConfigRows = rotationConfigs.data?.items ?? [];
  const rotateNow = useRotateCircuits();

  const rows: CircuitRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <PageHeader
          title="Rotación diaria"
          description="Cada día se destaca al azar un número fijo de circuitos — los demás quedan ocultos para el jugador hasta que les toque. El interruptor de activo/inactivo de cada circuito es independiente: uno inactivo nunca entra en la rotación."
          actions={
            <Button
              variant="outline"
              disabled={rotateNow.isPending}
              onClick={() => rotateNow.mutate()}
            >
              <RefreshCw size={16} />
              Rotar ahora
            </Button>
          }
        />
        <DataTable
          data={rotationConfigRows}
          columns={rotationConfigColumns}
          isLoading={rotationConfigs.isLoading}
          isError={rotationConfigs.isError}
          onRetry={() => void rotationConfigs.refetch()}
          pagination={{
            mode: 'offset',
            pagination: {
              page: 1,
              limit: rotationConfigRows.length || 1,
              total: rotationConfigRows.length,
              totalPages: 1,
            },
            onPageChange: () => {},
            onLimitChange: () => {},
          }}
          emptyMessage="No hay parámetros configurados"
        />
      </div>

      <div className="space-y-6">
        <PageHeader
          title="Circuitos"
          description="Circuitos base de racing, con su trazado, tema e imagen — cada uno agrupa varias variantes jugables (sentido, cilindrada, arquetipo)."
        />
        <DataTable
          data={rows}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          pagination={{
            mode: 'offset',
            pagination: meta,
            onPageChange: setPage,
            onLimitChange: (l) => {
              setLimit(l);
              setPage(1);
            },
          }}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Buscar por slug o nombre…"
          emptyMessage="No hay circuitos"
        />
      </div>
    </div>
  );
}
