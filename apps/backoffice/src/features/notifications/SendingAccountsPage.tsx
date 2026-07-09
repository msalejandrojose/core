import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { accountColumns } from './accounts-columns';
import { AccountFormDialog } from './components/AccountFormDialog';
import { useSendingAccounts } from './hooks/use-sending-accounts';

export function SendingAccountsPage() {
  const [limit, setLimit] = useState(20);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const currentCursor = cursors[cursors.length - 1];

  const { data, isLoading } = useSendingAccounts({
    limit,
    cursor: currentCursor,
  });
  const rows = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas de envío"
        description="Configura las cuentas de cada canal (email, SMS, WhatsApp, push). Los secretos se guardan cifrados."
        actions={
          <AccountFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nueva cuenta
              </Button>
            }
          />
        }
      />
      <DataTable
        data={rows}
        columns={accountColumns}
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
        emptyMessage="No hay cuentas de envío"
      />
    </div>
  );
}
