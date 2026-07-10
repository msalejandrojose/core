import { useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWebhookEvents } from './hooks/use-webhook-events';
import { webhookEventColumns } from './webhook-events-columns';
import {
  WEBHOOK_EVENT_STATUSES,
  WEBHOOK_EVENT_STATUS_LABELS,
  type WebhookEvent,
  type WebhookEventStatus,
} from './types';

export function WebhookEventsPage() {
  const [limit, setLimit] = useState(20);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<'all' | WebhookEventStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useWebhookEvents({
    limit,
    cursor: currentCursor,
    source: source.trim() || undefined,
    status: status === 'all' ? undefined : status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const rows: WebhookEvent[] = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Eventos entrantes por webhook (SendGrid…): payload crudo, resultado del procesamiento y reintento manual."
      />
      <DataTable
        data={rows}
        columns={webhookEventColumns}
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
          setSource(v);
          resetPaging();
        }}
        searchPlaceholder="Buscar por fuente (p. ej. sendgrid)…"
        emptyMessage="No hay eventos de webhook"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as 'all' | WebhookEventStatus);
                resetPaging();
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {WEBHOOK_EVENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {WEBHOOK_EVENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="wh-date-from" className="text-muted-foreground text-xs">
                Desde
              </Label>
              <Input
                id="wh-date-from"
                type="date"
                className="h-8 w-36"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  resetPaging();
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="wh-date-to" className="text-muted-foreground text-xs">
                Hasta
              </Label>
              <Input
                id="wh-date-to"
                type="date"
                className="h-8 w-36"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  resetPaging();
                }}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
