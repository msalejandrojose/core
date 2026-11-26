import { Eraser, Power, PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useDeleteOtaBundle,
  useOtaBundles,
  usePurgeOta,
  useSetOtaBundleEnabled,
  type OtaBundle,
} from './hooks';

const STATE: Record<OtaBundle['state'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  SERVING: { label: 'Sirviéndose', variant: 'default' },
  AVAILABLE: { label: 'Disponible', variant: 'secondary' },
  DISABLED: { label: 'Desactivada', variant: 'outline' },
  PURGED: { label: 'Borrada de R2', variant: 'outline' },
};

const size = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} KB`;

const date = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

/**
 * Actualizaciones en caliente (OTA) de las apps móviles: lo que se ha subido
 * por app con `pnpm --filter @core/mobile ota:publish`, cuál se están bajando
 * ahora los teléfonos, desactivar una (vuelta atrás a la anterior) y borrar
 * zips del almacenamiento. Los viejos se borran solos al subir.
 */
export function OtaBundlesPage() {
  const [app, setApp] = useState<string | null>(null);
  const { data, isLoading } = useOtaBundles(app, null);
  const toggle = useSetOtaBundleEnabled();
  const remove = useDeleteOtaBundle();
  const purge = usePurgeOta();

  const appId = data?.appId ?? null;
  const channel = data?.channel ?? 'production';
  const apps = [...new Set((data?.apps ?? []).map((a) => a.appId))];
  const bundles = data?.bundles ?? [];
  const stored = bundles.filter((b) => b.state !== 'PURGED');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actualizaciones de las apps"
        description={`Actualizaciones en caliente: la web de cada app, cifrada en R2. Los teléfonos se bajan la más reciente activa que encaje con su versión nativa. Se guardan las ${data?.keep ?? 5} últimas por app; las anteriores se borran solas.`}
        actions={
          appId ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={purge.isPending}>
                  <Eraser size={16} /> Limpiar ahora
                </Button>
              }
              title="¿Borrar los zips que sobran?"
              description={`Se borran de R2 los de ${appId} que pasan de las ${data?.keep ?? 5} últimas, salvo los que aún se sirven a alguna versión nativa.`}
              destructiveLabel="Limpiar"
              isPending={purge.isPending}
              onConfirm={() => purge.mutate({ appId, channel })}
            />
          ) : null
        }
      />

      {apps.length > 1 ? (
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">App</span>
          <Select value={appId ?? undefined} onValueChange={setApp}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {apps.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : appId ? (
        <p className="text-muted-foreground text-sm">
          App <span className="text-foreground font-mono">{appId}</span> · canal {channel} · {stored.length} en R2 (
          {size(stored.reduce((t, b) => t + b.sizeBytes, 0))})
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Versión</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Nativa mínima</TableHead>
            <TableHead className="text-right">Tamaño</TableHead>
            <TableHead>Subida</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6}>Cargando…</TableCell>
            </TableRow>
          ) : !bundles.length ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Todavía no hay subidas. Se publican desde el Mac con <code>pnpm --filter @core/mobile ota:publish</code>.
              </TableCell>
            </TableRow>
          ) : (
            bundles.map((b) => (
              <TableRow key={b.id} className={b.state === 'PURGED' ? 'opacity-60' : undefined}>
                <TableCell>
                  <div className="font-mono font-medium">{b.version}</div>
                  {b.notes ? <div className="text-muted-foreground text-xs">{b.notes}</div> : null}
                </TableCell>
                <TableCell>
                  <Badge variant={STATE[b.state].variant}>{STATE[b.state].label}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{b.minNativeVersion}</TableCell>
                <TableCell className="text-right tabular-nums">{size(b.sizeBytes)}</TableCell>
                <TableCell className="text-sm">
                  {date(b.createdAt)}
                  {b.purgedAt ? <div className="text-muted-foreground text-xs">Borrada el {date(b.purgedAt)}</div> : null}
                </TableCell>
                <TableCell>
                  {b.state === 'PURGED' ? null : (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={toggle.isPending}
                        title={b.isEnabled ? 'Desactivar (vuelven a la anterior)' : 'Activar'}
                        onClick={() => toggle.mutate({ id: b.id, isEnabled: !b.isEnabled })}
                      >
                        {b.isEnabled ? <PowerOff size={14} /> : <Power size={14} />}
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" className="size-8" title="Borrar de R2">
                            <Trash2 size={14} />
                          </Button>
                        }
                        title={`¿Borrar ${b.version}?`}
                        description={
                          b.state === 'SERVING'
                            ? 'Es la que se están bajando ahora los teléfonos: al borrarla pasarán a la anterior. El zip se borra de R2 y queda en el historial.'
                            : 'El zip se borra de R2 y queda en el historial. No se puede volver a activar.'
                        }
                        isPending={remove.isPending}
                        onConfirm={() => remove.mutate(b.id)}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
