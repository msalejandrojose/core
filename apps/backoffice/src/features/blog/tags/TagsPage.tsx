import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { TagRow } from '../types';
import { columns } from './columns';
import { TagFormDialog } from './components/TagFormDialog';
import { useTags } from './hooks/use-tags';

export function TagsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTags({
    page,
    limit,
    nameContains: search.trim() || undefined,
  });

  const rows: TagRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etiquetas"
        description="Clasifican los posts del blog (varias por post)."
        actions={
          <TagFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nueva etiqueta
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
        searchPlaceholder="Buscar por nombre…"
        emptyMessage="No hay etiquetas"
      />
    </div>
  );
}
