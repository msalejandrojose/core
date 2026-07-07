import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { CountryRow } from '../types';
import { columns } from './columns';
import { CountryFormDialog } from './CountryFormDialog';
import { useCountries } from './hooks/use-countries';

export function CountriesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useCountries({
    page,
    limit,
    search: search.trim() || undefined,
  });

  const rows: CountryRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Países"
        description="Nivel superior de la jerarquía de localización (ISO 3166-1)."
        actions={
          <CountryFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nuevo país
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
        searchPlaceholder="Buscar por nombre o ISO…"
        emptyMessage="No hay países"
      />
    </div>
  );
}
