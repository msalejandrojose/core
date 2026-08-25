import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import type { CarArchetypeRow } from '../../types';
import { columns } from './columns';
import { ArchetypeFormDialog } from './components/ArchetypeFormDialog';
import { useArchetypes } from './hooks/use-archetypes';

export function ArchetypesTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useArchetypes({
    page,
    limit,
    search: search.trim() || undefined,
  });

  const rows: CarArchetypeRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ArchetypeFormDialog
          trigger={
            <Button>
              <Plus size={16} />
              Nuevo arquetipo
            </Button>
          }
        />
      </div>
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
        searchPlaceholder="Buscar por código o nombre…"
        emptyMessage="No hay arquetipos"
      />
    </div>
  );
}
