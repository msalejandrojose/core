import { useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  addOutline,
  calendarClearOutline,
  carSportOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { CursorList, useCursorList } from '@/components/list';
import { toast } from '@/lib/toast';
import {
  cancelReservation,
  confirmReservation,
  hostReservationsFetcher,
  myParkingsFetcher,
  resolvePhotoUrl,
  type MyParking,
  type Reservation,
} from './parking.api';
import { parkingStatusLabel, reservationStatusColor, reservationStatusLabel } from './status';

function ParkingRow({ parking }: { parking: MyParking }) {
  const history = useHistory();
  const cover = parking.photos[0]?.url;
  return (
    <IonItem
      button
      detail
      lines="inset"
      onClick={() => history.push(`/tabs/host/parkings/${parking.id}`)}
    >
      <IonThumbnail slot="start">
        {cover ? (
          <img src={resolvePhotoUrl(cover)} alt="" style={{ borderRadius: 10, objectFit: 'cover' }} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--core-surface-inset)',
              borderRadius: 10,
            }}
          >
            <IonIcon icon={carSportOutline} style={{ fontSize: 22, color: 'var(--core-muted)' }} />
          </div>
        )}
      </IonThumbnail>
      <IonLabel className="ion-text-wrap">
        <div style={{ fontSize: 16, fontWeight: 550, color: 'var(--ion-text-color)' }}>
          {parking.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--core-muted)', marginTop: 2 }}>
          {parking.address}
        </div>
      </IonLabel>
      <IonBadge slot="end" color={parking.status === 'PUBLISHED' ? 'secondary' : 'medium'}>
        {parkingStatusLabel(parking.status)}
      </IonBadge>
    </IonItem>
  );
}

function HostReservationRow({
  reservation,
  onConfirm,
  onCancel,
}: {
  reservation: Reservation;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  return (
    <IonItem lines="inset">
      <IonLabel className="ion-text-wrap">
        <div style={{ fontSize: 16, fontWeight: 550, color: 'var(--ion-text-color)' }}>
          {fmt.format(new Date(reservation.startDate))} – {fmt.format(new Date(reservation.endDate))}
        </div>
        <div style={{ fontSize: 14, color: 'var(--core-muted)', marginTop: 2 }}>
          {reservation.totalAmount}€
        </div>
        {reservation.status === 'PENDING' ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <IonButton size="small" onClick={() => onConfirm(reservation.id)}>
              Confirmar
            </IonButton>
            <IonButton size="small" fill="outline" color="danger" onClick={() => onCancel(reservation.id)}>
              Rechazar
            </IonButton>
          </div>
        ) : null}
      </IonLabel>
      <IonBadge slot="end" color={reservationStatusColor(reservation.status)}>
        {reservationStatusLabel(reservation.status)}
      </IonBadge>
    </IonItem>
  );
}

/**
 * Área de host (tab raíz "Host"): mis plazas (CRUD + publicar/despublicar +
 * fotos, en `ParkingFormScreen`) y las reservas recibidas en ellas, en dos
 * segmentos de la misma pantalla para no gastar un tab entero en cada una.
 */
export default function HostParkingsScreen() {
  const [segment, setSegment] = useState<'parkings' | 'reservations'>('parkings');
  const history = useHistory();

  const parkings = useCursorList<MyParking>(myParkingsFetcher(), { limit: 20 });
  const reservations = useCursorList<Reservation>(hostReservationsFetcher({}), {
    limit: 20,
  });

  async function handleConfirm(id: string) {
    const ok = await confirmReservation(id);
    if (!ok) {
      toast.error('No se pudo confirmar la reserva');
      return;
    }
    toast.success('Reserva confirmada');
    void reservations.reload();
  }

  async function handleCancel(id: string) {
    const ok = await cancelReservation(id);
    if (!ok) {
      toast.error('No se pudo rechazar la reserva');
      return;
    }
    toast.success('Reserva rechazada');
    void reservations.reload();
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Host</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/tabs/host/verification')}>
              <IonIcon icon={shieldCheckmarkOutline} slot="icon-only" aria-hidden="true" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment
            className="core-segment"
            value={segment}
            onIonChange={(e) => setSegment(e.detail.value as 'parkings' | 'reservations')}
          >
            <IonSegmentButton value="parkings">
              <IonLabel>Mis plazas</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="reservations">
              <IonLabel>Reservas recibidas</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {segment === 'parkings' ? (
          <>
            <CursorList
              items={parkings.items}
              status={parkings.status}
              hasMore={parkings.hasMore}
              onReload={parkings.reload}
              onLoadMore={parkings.loadMore}
              keyFor={(p) => p.id}
              emptyIcon={carSportOutline}
              emptyTitle="Todavía no has publicado ninguna plaza."
              emptyDescription="Toca el botón + para dar de alta la primera."
              errorMessage="No se pudieron cargar tus plazas."
              renderItem={(p) => <ParkingRow parking={p} />}
            />
            <IonFab vertical="bottom" horizontal="end" slot="fixed">
              <IonFabButton onClick={() => history.push('/tabs/host/parkings/new')}>
                <IonIcon icon={addOutline} aria-hidden="true" />
              </IonFabButton>
            </IonFab>
          </>
        ) : (
          <CursorList
            items={reservations.items}
            status={reservations.status}
            hasMore={reservations.hasMore}
            onReload={reservations.reload}
            onLoadMore={reservations.loadMore}
            keyFor={(r) => r.id}
            emptyIcon={calendarClearOutline}
            emptyTitle="Todavía no has recibido reservas."
            errorMessage="No se pudieron cargar las reservas."
            renderItem={(r) => (
              <HostReservationRow reservation={r} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
          />
        )}
      </IonContent>
    </IonPage>
  );
}
