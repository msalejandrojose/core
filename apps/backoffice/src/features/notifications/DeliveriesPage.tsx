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
import { NOTIFICATION_CHANNELS, type NotificationChannel } from '@core/shared-types';
import { deliveryColumns } from './deliveries-columns';
import { useDeliveries } from './hooks/use-deliveries';
import {
  CHANNEL_LABELS,
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABELS,
  type Delivery,
  type DeliveryStatus,
} from './types';

export function DeliveriesPage() {
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<'all' | NotificationChannel>('all');
  const [status, setStatus] = useState<'all' | DeliveryStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useDeliveries({
    limit,
    cursor: currentCursor,
    to: search.trim() || undefined,
    channel: channel === 'all' ? undefined : channel,
    status: status === 'all' ? undefined : status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const rows: Delivery[] = data?.data ?? [];
  const resetPaging = () => setCursors([undefined]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envíos"
        description="Log de entregabilidad: estado de cada envío por canal y su histórico de eventos."
      />
      <DataTable
        data={rows}
        columns={deliveryColumns}
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
        searchPlaceholder="Buscar por destinatario…"
        emptyMessage="No hay envíos"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={channel}
              onValueChange={(v) => {
                setChannel(v as 'all' | NotificationChannel);
                resetPaging();
              }}
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los canales</SelectItem>
                {NOTIFICATION_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as 'all' | DeliveryStatus);
                resetPaging();
              }}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {DELIVERY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DELIVERY_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="date-from" className="text-muted-foreground text-xs">
                Desde
              </Label>
              <Input
                id="date-from"
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
              <Label htmlFor="date-to" className="text-muted-foreground text-xs">
                Hasta
              </Label>
              <Input
                id="date-to"
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
