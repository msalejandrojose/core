import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from './columns';
import { useMatchmakingConfigs } from './hooks/use-matchmaking-configs';
import { usePlayerRatings } from './hooks/use-player-ratings';
import { playerRatingsColumns } from './player-ratings-columns';

export function MatchmakingConfigPage() {
  const { data, isLoading, isError, refetch } = useMatchmakingConfigs();
  const rows = data?.items ?? [];

  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsLimit, setRatingsLimit] = useState(20);
  const ratingsQuery = usePlayerRatings({ page: ratingsPage, limit: ratingsLimit });
  const ratingRows = ratingsQuery.data?.data ?? [];
  const ratingsMeta = ratingsQuery.data?.meta ?? {
    page: ratingsPage,
    limit: ratingsLimit,
    total: 0,
    totalPages: 1,
  };

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <PageHeader
          title="Ranking online"
          description="Rating de los jugadores de la fase online real, de mayor a menor — sube o baja tras cada carrera en vivo con al menos dos corredores reales."
        />
        <DataTable
          data={ratingRows}
          columns={playerRatingsColumns((ratingsPage - 1) * ratingsLimit)}
          isLoading={ratingsQuery.isLoading}
          isError={ratingsQuery.isError}
          onRetry={() => void ratingsQuery.refetch()}
          pagination={{
            mode: 'offset',
            pagination: ratingsMeta,
            onPageChange: setRatingsPage,
            onLimitChange: (l) => {
              setRatingsLimit(l);
              setRatingsPage(1);
            },
          }}
          emptyMessage="Todavía no hay ninguna carrera en vivo con rating registrado"
        />
      </div>

      <div className="space-y-6">
        <PageHeader
          title="Matchmaking en vivo"
          description="Parámetros del emparejamiento de la fase online real — cuánto se mueve el rating por carrera, la ventana inicial de búsqueda por nivel, y cuánto se espera antes de rellenar una sala con rivales ficticios. Editable sin desplegar código."
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
          emptyMessage="No hay parámetros configurados"
        />
      </div>
    </div>
  );
}
