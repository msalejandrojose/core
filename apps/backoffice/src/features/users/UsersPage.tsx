import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { columns, type UserRow } from './columns';
import { CreateUserDialog } from './components/CreateUserDialog';
import { useUsers } from './hooks/use-users';

type UserTypeFilter = 'all' | 'BACKOFFICE' | 'APP';
type StatusFilter = 'all' | 'active' | 'inactive';

export function UsersPage() {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState<UserTypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  // Pila de cursores: el primer elemento es `undefined` (primera página) y el
  // último es el cursor de la página que se está mostrando ahora mismo.
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useUsers({
    limit,
    cursor: currentCursor,
    emailContains: search.trim() || undefined,
    userType: userType === 'all' ? undefined : userType,
    isActive: status === 'all' ? undefined : status === 'active',
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
        toolbar={
          <>
            <Select
              value={userType}
              onValueChange={(v) => {
                setUserType(v as UserTypeFilter);
                resetPaging();
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="BACKOFFICE">Backoffice</SelectItem>
                <SelectItem value="APP">App</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as StatusFilter);
                resetPaging();
              }}
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <CreateUserDialog />
          </>
        }
      />
    </div>
  );
}
