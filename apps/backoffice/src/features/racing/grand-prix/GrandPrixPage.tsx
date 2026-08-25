import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { GrandPrixRow } from '../types';
import { columns } from './columns';
import { useGrandPrixList } from './hooks/use-grand-prix-list';

export function GrandPrixPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGrandPrixList({
    page,
    limit,
    search: search.trim() || undefined,
  });

  const rows: GrandPrixRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grand Prix"
        description="Grand Prix de racing: varios circuitos en un orden fijo, con clasificación agregada propia."
        actions={
          <Button asChild>
            <Link to="/racing/grand-prix/new">
              <Plus size={16} />
              Nuevo Grand Prix
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
        emptyMessage="No hay Grand Prix"
      />
    </div>
  );
}
