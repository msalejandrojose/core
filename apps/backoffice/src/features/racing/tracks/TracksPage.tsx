import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { TrackRow } from '../types';
import { columns } from './columns';
import { useTracks } from './hooks/use-tracks';

export function TracksPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTracks({
    page,
    limit,
    search: search.trim() || undefined,
  });

  const rows: TrackRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circuitos"
        description="Circuitos de racing, activos e inactivos, con su geometría y físicas."
        actions={
          <Button asChild>
            <Link to="/racing/tracks/new">
              <Plus size={16} />
              Nuevo circuito
            </Link>
          </Button>
        }
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
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Buscar por slug o nombre…"
        emptyMessage="No hay circuitos"
      />
    </div>
  );
}
