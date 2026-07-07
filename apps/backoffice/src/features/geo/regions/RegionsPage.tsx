import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { RegionRow } from '../types';
import { useCountries } from '../countries/hooks/use-countries';
import { makeColumns } from './columns';
import { RegionFormDialog } from './RegionFormDialog';
import { useRegions } from './hooks/use-regions';

export function RegionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useRegions({
    page,
    limit,
    search: search.trim() || undefined,
  });
  const { data: countriesData } = useCountries({ page: 1, limit: 200 });

  const countryNameById = useMemo(
    () => new Map((countriesData?.data ?? []).map((c) => [c.id, c.name])),
    [countriesData],
  );
  const columns = useMemo(() => makeColumns(countryNameById), [countryNameById]);

  const rows: RegionRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunidades autónomas"
        description="Segundo nivel: agrupan provincias dentro de un país."
        actions={
          <RegionFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nueva comunidad
              </Button>
            }
          />
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
        searchPlaceholder="Buscar por nombre o código…"
        emptyMessage="No hay comunidades"
      />
    </div>
  );
}
