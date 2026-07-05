import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { columns } from './columns';
import { CreateLeadDialog } from './components/CreateLeadDialog';
import { useLeads } from './hooks/use-leads';
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadRow,
  type LeadSource,
  type LeadStatus,
} from './types';

export function LeadsPage() {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | LeadStatus>('all');
  const [source, setSource] = useState<'all' | LeadSource>('all');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useLeads({
    limit,
    cursor: currentCursor,
    q: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    source: source === 'all' ? undefined : source,
  });

  const rows: LeadRow[] = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Gestiona los contactos comerciales y su pipeline."
        actions={
          <CreateLeadDialog trigger={<Button>Nuevo lead</Button>} />
        }
      />
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
        searchPlaceholder="Buscar por nombre, email o empresa…"
        emptyMessage="No hay leads"
        toolbar={
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as 'all' | LeadStatus);
                resetPaging();
              }}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={source}
              onValueChange={(v) => {
                setSource(v as 'all' | LeadSource);
                resetPaging();
              }}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los orígenes</SelectItem>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}
