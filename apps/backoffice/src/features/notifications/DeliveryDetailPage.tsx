import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DeliveryStatusBadge } from './components/DeliveryStatusBadge';
import { useDelivery } from './hooks/use-delivery';
import { CHANNEL_LABELS } from './types';

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-words">{value ?? '—'}</span>
    </div>
  );
}

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: delivery, isLoading } = useDelivery(id);

  if (isLoading || !delivery) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications/deliveries')}
          aria-label="Volver"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{delivery.to}</h1>
          <div className="mt-1 flex items-center gap-2">
            <DeliveryStatusBadge status={delivery.status} />
            <Badge variant="secondary">{CHANNEL_LABELS[delivery.channel]}</Badge>
            <span className="text-muted-foreground text-sm font-mono">
              {delivery.messageTypeKey}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de eventos</CardTitle>
            </CardHeader>
            <CardContent>
              {delivery.events.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aún no hay eventos del proveedor.
                </p>
              ) : (
                <ol className="space-y-4">
                  {[...delivery.events].reverse().map((e, i) => (
                    <li key={i} className="border-border border-l-2 pl-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{e.type}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {dateFmt(e.at)}
                        </span>
                      </div>
                      {e.reason && (
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {e.reason}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {delivery.error && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{delivery.error}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardContent className="divide-border divide-y">
              <InfoRow label="Proveedor" value={delivery.provider} />
              <InfoRow label="Asunto" value={delivery.subject} />
              <InfoRow
                label="ID del proveedor"
                value={delivery.providerMessageId}
              />
              <InfoRow label="Enviado" value={dateFmt(delivery.createdAt)} />
              <InfoRow
                label="Entregado"
                value={delivery.deliveredAt ? dateFmt(delivery.deliveredAt) : null}
              />
              <InfoRow
                label="Último evento"
                value={delivery.lastEventAt ? dateFmt(delivery.lastEventAt) : null}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
