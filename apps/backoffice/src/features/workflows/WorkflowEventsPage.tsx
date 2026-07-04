import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { eventsColumns } from './events-columns';
import { useWorkflowEvents, useWorkflowEventTypes } from './hooks/use-workflow-events';

const ALL = '__all__';

export function WorkflowEventsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [type, setType] = useState<string>(ALL);

  const { data, isLoading, isError, refetch } = useWorkflowEvents({
    page,
    limit,
    type: type === ALL ? undefined : type,
  });
  const { data: types } = useWorkflowEventTypes();

  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos"
        description="Eventos registrados en el motor (auditoría y replay). Los triggers de tipo evento se disparan a partir de aquí."
      />
      <DataTable
        data={data?.data ?? []}
        columns={eventsColumns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        pagination={{
          mode: 'offset',
          pagination: { page, limit, total, totalPages },
          onPageChange: setPage,
          onLimitChange: (l) => {
            setLimit(l);
            setPage(1);
          },
        }}
        emptyMessage="No hay eventos todavía"
        toolbar={
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {(types ?? []).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
