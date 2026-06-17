import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { columns, type UserRow } from './columns';
import { CreateUserDialog } from './components/CreateUserDialog';
import { useUsers } from './hooks/use-users';

export function UsersPage() {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  // Pila de cursores: el primer elemento es `undefined` (primera página) y el
  // último es el cursor de la página que se está mostrando ahora mismo.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useUsers({
    limit,
    cursor: currentCursor,
    emailContains: search.trim() || undefined,
  });

  const rows: UserRow[] = data?.data ?? [];

  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
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
        searchPlaceholder="Buscar por email…"
        emptyMessage="No hay usuarios"
        toolbar={<CreateUserDialog />}
      />
    </div>
  );
}
