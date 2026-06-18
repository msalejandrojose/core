import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { columns } from './columns';
import { CreateApiSectionDialog } from './components/CreateApiSectionDialog';
import { useApiSectionsList } from './hooks/use-api-sections-list';
import type { ApiSectionRow } from './types';

export function ApiSectionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useApiSectionsList({
    page,
    limit,
    codeContains: search.trim() || undefined,
  });

  const rows: ApiSectionRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Secciones"
        description="Catálogo de ApiSections sobre el que se conceden permisos."
        actions={<CreateApiSectionDialog />}
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
        emptyMessage="No hay secciones"
      />
    </div>
  );
}
