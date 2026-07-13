import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ParkingStatusBadge } from './components/ParkingStatusBadge';
import { useParking } from './hooks/use-parking';
import {
  useUnpublishParking,
  useUnverifyParking,
  useVerifyParking,
} from './hooks/use-parking-mutations';
import { useReservations } from './hooks/use-reservations';
import { reservationColumns } from './reservation-columns';
import { DataTable } from '@/components/data-table/DataTable';
import { resolveFileUrl } from '@/lib/file-url';
import type { ParkingRow, ReservationRow } from './types';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-words">{value}</span>
    </div>
  );
}

export function ParkingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useParking(id);
  const unpublish = useUnpublishParking(id ?? '');
  const verify = useVerifyParking(id ?? '');
  const unverify = useUnverifyParking(id ?? '');
  const { data: reservationsPage } = useReservations({ limit: 10, parkingId: id });

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  const parking = data as ParkingRow;
  const reservations: ReservationRow[] = reservationsPage?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/parking/parkings')}
            aria-label="Volver"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {parking.title}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <ParkingStatusBadge status={parking.status} />
              {parking.verified && (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="size-3" />
                  Verificada
                </Badge>
              )}
              <span className="text-muted-foreground text-sm">
                {parking.pricePerDay}€ / día
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {parking.verified ? (
            <Button variant="outline" disabled={unverify.isPending} onClick={() => unverify.mutate()}>
              Quitar verificación
            </Button>
          ) : (
            <Button variant="outline" disabled={verify.isPending} onClick={() => verify.mutate()}>
              Verificar plaza
            </Button>
          )}
          {parking.status === 'PUBLISHED' && (
            <ConfirmDialog
              trigger={<Button variant="outline">Despublicar</Button>}
              title="¿Despublicar esta plaza?"
              description="Dejará de ser visible en el buscador y no se podrá reservar hasta que el host la vuelva a publicar."
              destructiveLabel="Despublicar"
              isPending={unpublish.isPending}
              onConfirm={() => unpublish.mutate()}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {parking.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {parking.photos.map((photo) => (
                <img
                  key={photo.id}
                  src={resolveFileUrl(photo.url)}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Reservas de esta plaza</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                data={reservations}
                columns={reservationColumns}
                emptyMessage="Sin reservas todavía"
                pagination={{
                  mode: 'cursor',
                  limit: 10,
                  hasMore: false,
                  hasPrevious: false,
                  onNext: () => {},
                  onPrevious: () => {},
                  onLimitChange: () => {},
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="divide-border divide-y">
              <InfoRow label="Dirección" value={parking.address} />
              <InfoRow label="Latitud" value={String(parking.latitude)} />
              <InfoRow label="Longitud" value={String(parking.longitude)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Host</CardTitle>
            </CardHeader>
            <CardContent className="divide-border divide-y">
              <InfoRow label="Host user id" value={parking.hostUserId} />
              <InfoRow
                label="Publicada"
                value={new Date(parking.createdAt).toLocaleDateString('es-ES')}
              />
            </CardContent>
          </Card>

          {parking.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{parking.description}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
