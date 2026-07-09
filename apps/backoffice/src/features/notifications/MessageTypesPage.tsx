import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { MessageTypeFormDialog } from './components/MessageTypeFormDialog';
import { messageTypeColumns } from './message-types-columns';
import { useMessageTypes } from './hooks/use-message-types';

export function MessageTypesPage() {
  const [limit, setLimit] = useState(20);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const currentCursor = cursors[cursors.length - 1];

  const { data, isLoading } = useMessageTypes({ limit, cursor: currentCursor });
  const rows = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de mensaje"
        description="Plantillas de mensaje por cuenta y canal. Admiten variables {{ var }}."
        actions={
          <MessageTypeFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nuevo tipo de mensaje
              </Button>
            }
          />
        }
      />
      <DataTable
        data={rows}
        columns={messageTypeColumns}
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
        emptyMessage="No hay tipos de mensaje"
      />
    </div>
  );
}
