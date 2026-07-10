import { ArrowLeft, RefreshCw } from 'lucide-react';
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
import { WebhookEventStatusBadge } from './components/WebhookEventStatusBadge';
import { useReprocessWebhookEvent } from './hooks/use-reprocess-webhook-event';
import { useWebhookEvent } from './hooks/use-webhook-event';

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

export function WebhookEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useWebhookEvent(id);
  const reprocess = useReprocessWebhookEvent(id ?? '');

  if (isLoading || !event) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/notifications/webhooks')}
            aria-label="Volver"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.source}
              {event.type ? ` · ${event.type}` : ''}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <WebhookEventStatusBadge status={event.status} />
              <Badge variant={event.signatureValid ? 'outline' : 'destructive'}>
                {event.signatureValid ? 'Firma válida' : 'Firma inválida'}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          disabled={reprocess.isPending}
          onClick={() => reprocess.mutate()}
        >
          <RefreshCw
            size={16}
            className={reprocess.isPending ? 'animate-spin' : undefined}
          />
          {reprocess.isPending ? 'Reprocesando…' : 'Reprocesar'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payload</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted max-h-[32rem] overflow-auto rounded-md p-4 text-xs">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalle</CardTitle>
            </CardHeader>
            <CardContent className="divide-border divide-y">
              <InfoRow label="Fuente" value={event.source} />
              <InfoRow label="Tipo" value={event.type} />
              <InfoRow label="Resultado" value={event.result} />
              <InfoRow label="Recibido" value={dateFmt(event.createdAt)} />
              <InfoRow
                label="Procesado"
                value={event.processedAt ? dateFmt(event.processedAt) : null}
              />
            </CardContent>
          </Card>

          {event.error && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{event.error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
