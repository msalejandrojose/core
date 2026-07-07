import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { ProvinceRow } from '../types';
import { useCountries } from '../countries/hooks/use-countries';
import { useRegions } from '../regions/hooks/use-regions';
import { makeColumns } from './columns';
import { ProvinceFormDialog } from './ProvinceFormDialog';
import { useProvinces } from './hooks/use-provinces';

export function ProvincesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useProvinces({
    page,
    limit,
    search: search.trim() || undefined,
  });
  const { data: countriesData } = useCountries({ page: 1, limit: 200 });
  const { data: regionsData } = useRegions({ page: 1, limit: 200 });

  const countryNameById = useMemo(
    () => new Map((countriesData?.data ?? []).map((c) => [c.id, c.name])),
    [countriesData],
  );
  const regionNameById = useMemo(
    () => new Map((regionsData?.data ?? []).map((r) => [r.id, r.name])),
    [regionsData],
  );
  const columns = useMemo(
    () => makeColumns(countryNameById, regionNameById),
    [countryNameById, regionNameById],
  );

  const rows: ProvinceRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provincias"
        description="Tercer nivel: pertenecen a un país y, opcionalmente, a una comunidad."
        actions={
          <ProvinceFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nueva provincia
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
        emptyMessage="No hay provincias"
      />
    </div>
  );
}
