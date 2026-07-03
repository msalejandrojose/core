import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { columns } from './columns';
import { useForms } from './hooks/use-forms';
import {
  FORM_STATUSES,
  FORM_STATUS_LABELS,
  type FormRow,
  type FormStatus,
} from './types';

type StatusFilter = 'all' | FormStatus;

export function FormsListPage() {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useForms({
    limit,
    cursor: currentCursor,
    titleContains: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
  });

  const rows: FormRow[] = (data?.data ?? []).map((f) => ({
    id: f.id,
    title: f.title,
    status: f.status,
    createdAt: f.createdAt,
    fieldCount: f.schema?.fields?.length ?? 0,
  }));

  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formularios"
        description="Diseña formularios dinámicos, publícalos por enlace y revisa las respuestas."
        actions={
          <Button asChild>
            <Link to="/forms/nuevo">
              <Plus size={16} />
              Nuevo formulario
            </Link>
          </Button>
        }
      />
      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        pagination={{
          mode: 'cursor',
          limit,
          hasMore: data?.meta.hasMore ?? false,
          hasPrevious: cursors.length > 1,
          onNext: () => {
            const next = data?.meta.nextCursor;
            if (next) setCursors((s) => [...s, next]);
          },
          onPrevious: () =>
            setCursors((s) => (s.length > 1 ? s.slice(0, -1) : s)),
          onLimitChange: (l) => {
            setLimit(l);
            resetPaging();
          },
        }}
        onSearch={(v) => {
          setSearch(v);
          resetPaging();
        }}
        searchPlaceholder="Buscar por título…"
        emptyMessage="No hay formularios todavía"
        toolbar={
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as StatusFilter);
              resetPaging();
            }}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {FORM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {FORM_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
