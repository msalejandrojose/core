import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { MunicipalityRow } from '../types';
import { useProvinces } from '../provinces/hooks/use-provinces';
import { makeColumns } from './columns';
import { MunicipalityFormDialog } from './MunicipalityFormDialog';
import { useMunicipalities } from './hooks/use-municipalities';

export function MunicipalitiesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMunicipalities({
    page,
    limit,
    search: search.trim() || undefined,
  });
  const { data: provincesData } = useProvinces({ page: 1, limit: 200 });

  const provinceNameById = useMemo(
    () => new Map((provincesData?.data ?? []).map((p) => [p.id, p.name])),
    [provincesData],
  );
  const columns = useMemo(() => makeColumns(provinceNameById), [provinceNameById]);

  const rows: MunicipalityRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Municipios"
        description="Cuarto nivel: pertenecen a una provincia (código INE de 5 dígitos)."
        actions={
          <MunicipalityFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nuevo municipio
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
        emptyMessage="No hay municipios"
      />
    </div>
  );
}
