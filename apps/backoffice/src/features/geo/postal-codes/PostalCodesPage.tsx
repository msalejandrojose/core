import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { PostalCodeRow } from '../types';
import { useMunicipalities } from '../municipalities/hooks/use-municipalities';
import { makeColumns } from './columns';
import { PostalCodeFormDialog } from './PostalCodeFormDialog';
import { usePostalCodes } from './hooks/use-postal-codes';

export function PostalCodesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = usePostalCodes({
    page,
    limit,
    search: search.trim() || undefined,
  });
  const { data: municipalitiesData } = useMunicipalities({ page: 1, limit: 200 });

  const municipalityNameById = useMemo(
    () => new Map((municipalitiesData?.data ?? []).map((m) => [m.id, m.name])),
    [municipalitiesData],
  );
  const columns = useMemo(
    () => makeColumns(municipalityNameById),
    [municipalityNameById],
  );

  const rows: PostalCodeRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Códigos postales"
        description="Último nivel: pertenecen a un municipio."
        actions={
          <PostalCodeFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nuevo código postal
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
        searchPlaceholder="Buscar por código…"
        emptyMessage="No hay códigos postales"
      />
    </div>
  );
}
