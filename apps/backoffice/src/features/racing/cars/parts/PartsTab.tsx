import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAR_PART_CATEGORY_LABELS, type CarPartRow } from '../../types';
import { columns } from './columns';
import { PartFormDialog } from './components/PartFormDialog';
import { useParts } from './hooks/use-parts';

const ALL_CATEGORIES = '__all__';

export function PartsTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const { data, isLoading } = useParts({
    page,
    limit,
    search: search.trim() || undefined,
    category:
      category === ALL_CATEGORIES
        ? undefined
        : (category as CarPartRow['category']),
  });

  const rows: CarPartRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
            {Object.entries(CAR_PART_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PartFormDialog
          trigger={
            <Button>
              <Plus size={16} />
              Nueva pieza
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
        emptyMessage="No hay piezas"
      />
    </div>
  );
}
