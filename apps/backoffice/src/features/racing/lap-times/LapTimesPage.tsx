import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '@/features/users/hooks/use-users';
import { useTracks } from '../tracks/hooks/use-tracks';
import { columns } from './columns';
import { useAdminLapTimes } from './hooks/use-admin-lap-times';

const ALL = 'all';

export function LapTimesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [trackId, setTrackId] = useState<string>(ALL);
  const [userId, setUserId] = useState<string>(ALL);

  const { data: tracksData } = useTracks({ page: 1, limit: 100 });
  const tracks = tracksData?.data ?? [];

  // Jugadores de la app (APP, no BACKOFFICE): son quienes pueden subir un
  // tiempo. Independiente del filtro de circuito/jugador ya aplicado, si no
  // el desplegable se quedaría reducido a quien ya está filtrado.
  const { data: usersData } = useUsers({ limit: 100, userType: 'APP' });
  const players = usersData?.data ?? [];

  const { data, isLoading } = useAdminLapTimes({
    page,
    limit,
    trackId: trackId === ALL ? undefined : trackId,
    userId: userId === ALL ? undefined : userId,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intentos"
        description="Todos los tiempos subidos, filtrables por circuito y jugador — se distingue la mejor marca de cada jugador del resto de sus intentos."
      />
      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        pagination={{
          mode: 'offset',
          pagination: meta,
          onPageChange: setPage,
          onLimitChange: (l) => {
            setLimit(l);
            setPage(1);
          },
        }}
        emptyMessage="No hay intentos con estos filtros"
        toolbar={
          <>
            <Select
              value={trackId}
              onValueChange={(v) => {
                setTrackId(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Circuito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los circuitos</SelectItem>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={userId}
              onValueChange={(v) => {
                setUserId(v);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-48">
                <SelectValue placeholder="Jugador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los jugadores</SelectItem>
                {players.map((p) => {
                  const name = [p.firstName, p.lastName]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {name || p.email}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
