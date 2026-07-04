import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { columns } from './columns';
import { useWorkflowDefinitions } from './hooks/use-workflow-definitions';
import type { WorkflowDefinitionRow } from './types';

export function WorkflowsListPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, isError, refetch } = useWorkflowDefinitions({
    page,
    limit,
  });

  const rows: WorkflowDefinitionRow[] = (data?.data ?? []).map((d) => ({
    key: d.key,
    name: d.name,
    version: d.version,
    isActive: d.isActive,
    createdAt: d.createdAt,
    triggerCount: d.dsl?.triggers?.length ?? 0,
    stepCount: d.dsl?.steps?.length ?? 0,
  }));

  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Automatizaciones disparadas por eventos: cada workflow encadena acciones y condiciones. Abre uno para ver su lienzo."
      />
      <DataTable
        data={rows}
        columns={columns}
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
        emptyMessage="No hay workflows publicados todavía"
      />
    </div>
  );
}
