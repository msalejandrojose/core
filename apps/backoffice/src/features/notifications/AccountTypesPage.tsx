import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { accountTypeColumns } from './account-types-columns';
import { AccountTypeFormDialog } from './components/AccountTypeFormDialog';
import { useAccountTypes } from './hooks/use-account-types';

export function AccountTypesPage() {
  const { data, isLoading } = useAccountTypes();
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de cuenta"
        description="Catálogo de tipos por canal. Cada tipo define los campos de configuración y de mensaje."
        actions={
          <AccountTypeFormDialog
            trigger={
              <Button>
                <Plus size={16} />
                Nuevo tipo
              </Button>
            }
          />
        }
      />
      <DataTable
        data={rows}
        columns={accountTypeColumns}
        isLoading={isLoading}
        pagination={{
          mode: 'offset',
          pagination: {
            page: 1,
            limit: rows.length || 1,
            total: rows.length,
            totalPages: 1,
          },
          onPageChange: () => {},
        }}
        emptyMessage="No hay tipos de cuenta"
      />
    </div>
  );
}
