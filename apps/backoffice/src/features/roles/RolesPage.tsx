import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { columns } from './columns';
import { CreateRoleDialog } from './components/CreateRoleDialog';
import { useRoles } from './hooks/use-roles';
import type { RoleRow } from './types';

export function RolesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useRoles({
    page,
    limit,
    codeContains: search.trim() || undefined,
  });

  const rows: RoleRow[] = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Roles</h1>
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
        emptyMessage="No hay roles"
        toolbar={<CreateRoleDialog />}
      />
    </div>
  );
}
