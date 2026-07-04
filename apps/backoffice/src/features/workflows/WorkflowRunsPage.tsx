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
import { runsColumns } from './runs-columns';
import { useWorkflowRuns } from './hooks/use-workflow-runs';
import { RUN_STATUSES, RUN_STATUS_LABELS, type WorkflowRunStatus } from './types';

type StatusFilter = 'all' | WorkflowRunStatus;

export function WorkflowRunsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<StatusFilter>('all');

  const { data, isLoading, isError, refetch } = useWorkflowRuns({
    page,
    limit,
    status: status === 'all' ? undefined : status,
  });

  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ejecuciones"
        description="Historial de runs de los workflows: estado, step actual y resultado."
      />
      <DataTable
        data={data?.data ?? []}
        columns={runsColumns}
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
        emptyMessage="No hay ejecuciones todavía"
        toolbar={
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {RUN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {RUN_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
