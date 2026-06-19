import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { columns } from './columns';
import { UploadFileButton } from './components/UploadFileButton';
import { useFiles } from './hooks/use-files';
import type { StoredFile } from './types';

export function FilesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading } = useFiles({ page, pageSize });

  const rows: StoredFile[] = data?.items ?? [];
  const total = data?.total ?? 0;
  // El endpoint devuelve `{ items, total }`; derivamos el `meta` que pide el
  // DataTable en modo offset.
  const meta = {
    page,
    limit: pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archivos"
        description="Sube, descarga y elimina los ficheros del storage."
        actions={<UploadFileButton />}
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
            setPageSize(l);
            setPage(1);
          },
        }}
        emptyMessage="No hay ficheros"
      />
    </div>
  );
}
