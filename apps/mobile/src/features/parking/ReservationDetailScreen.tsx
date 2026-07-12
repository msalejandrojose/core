import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import {
  cancelReservation,
  getPublicParking,
  getReservation,
  type ParkingPublic,
  type Reservation,
} from './parking.api';
import { reservationStatusColor, reservationStatusLabel } from './status';

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Detalle de una reserva propia (huésped): fechas, importe, estado y, si el
 * estado lo permite (`PENDING`/`CONFIRMED`), cancelarla. Carga también la
 * ficha pública de la plaza para dar contexto (título, dirección, foto).
 */
export default function ReservationDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [parking, setParking] = useState<ParkingPublic | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setStatus('loading');
    const r = await getReservation(id);
    if (!r) {
      setStatus('error');
      return;
    }
    setReservation(r);
    setStatus('ready');
    // Best-effort: si la plaza ya no está publicada, seguimos mostrando la reserva.
    setParking(await getPublicParking(r.parkingId));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCancel() {
    if (!reservation) return;
    setCancelling(true);
    const ok = await cancelReservation(reservation.id);
    setCancelling(false);
    if (!ok) {
      toast.error('No se pudo cancelar la reserva');
      return;
    }
    toast.success('Reserva cancelada');
    void load();
  }

  const cancellable = reservation && reservation.status !== 'CANCELLED';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/reservations" text="" />
          </IonButtons>
          <IonTitle>Reserva</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {status === 'loading' ? (
          <SkeletonList rows={4} />
        ) : status === 'error' || !reservation ? (
          <ErrorState message="No se pudo cargar la reserva." onRetry={load} />
        ) : (
          <>
            <div className="core-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 className="core-title" style={{ fontSize: 22 }}>
                  {parking?.title ?? 'Plaza'}
                </h1>
                <IonBadge color={reservationStatusColor(reservation.status)}>
                  {reservationStatusLabel(reservation.status)}
                </IonBadge>
              </div>
              {parking ? (
                <p className="core-subtitle" style={{ marginTop: 4 }}>
                  {parking.address}
                </p>
              ) : null}

              <div style={{ marginTop: 16, fontSize: 15 }}>
                <p style={{ margin: '6px 0' }}>
                  <strong>Entrada:</strong> {dateFmt.format(new Date(reservation.startDate))}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Salida:</strong> {dateFmt.format(new Date(reservation.endDate))}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Total:</strong> {reservation.totalAmount}€
                </p>
              </div>

              {cancellable ? (
                <IonButton
                  expand="block"
                  color="danger"
                  fill="outline"
                  style={{ marginTop: 16 }}
                  disabled={cancelling}
                  onClick={handleCancel}
                >
                  {cancelling ? 'Cancelando…' : 'Cancelar reserva'}
                </IonButton>
              ) : null}
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
