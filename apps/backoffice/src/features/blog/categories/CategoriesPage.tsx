import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import type { CategoryRow } from '../types';
import { columns } from './columns';
import { CategoryFormDialog } from './components/CategoryFormDialog';
import { useCategories } from './hooks/use-categories';

export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useCategories({
    page,
    limit,
    nameContains: search.trim() || undefined,
  });

  const rows: CategoryRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Clasifican los posts del blog (una por post)."
        actions={
          <CategoryFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nueva categoría
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
        emptyMessage="No hay categorías"
      />
    </div>
  );
}
