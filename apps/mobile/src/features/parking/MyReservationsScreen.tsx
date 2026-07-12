import { IonBadge, IonContent, IonHeader, IonItem, IonLabel, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { calendarClearOutline } from 'ionicons/icons';
import { CursorList, useCursorList } from '@/components/list';
import { myReservationsFetcher, type Reservation } from './parking.api';
import { reservationStatusColor, reservationStatusLabel } from './status';

function dateRange(startDate: string, endDate: string): string {
  const fmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  return `${fmt.format(new Date(startDate))} – ${fmt.format(new Date(endDate))}`;
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const history = useHistory();
  return (
    <IonItem
      button
      detail
      lines="inset"
      onClick={() => history.push(`/tabs/reservations/${reservation.id}`)}
    >
      <IonLabel className="ion-text-wrap">
        <div style={{ fontSize: 16, fontWeight: 550, color: 'var(--ion-text-color)' }}>
          {dateRange(reservation.startDate, reservation.endDate)}
        </div>
        <div style={{ fontSize: 14, color: 'var(--core-muted)', marginTop: 2 }}>
          {reservation.totalAmount}€
        </div>
      </IonLabel>
      <IonBadge slot="end" color={reservationStatusColor(reservation.status)}>
        {reservationStatusLabel(reservation.status)}
      </IonBadge>
    </IonItem>
  );
}

/** Mis reservas como huésped (tab raíz "Reservas"). */
export default function MyReservationsScreen() {
  const { items, status, hasMore, reload, loadMore } = useCursorList<Reservation>(
    myReservationsFetcher(),
    { limit: 20 },
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mis reservas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <CursorList
          items={items}
          status={status}
          hasMore={hasMore}
          onReload={reload}
          onLoadMore={loadMore}
          keyFor={(r) => r.id}
          emptyIcon={calendarClearOutline}
          emptyTitle="Todavía no has reservado ninguna plaza."
          errorMessage="No se pudieron cargar tus reservas."
          renderItem={(r) => <ReservationRow reservation={r} />}
        />
      </IonContent>
    </IonPage>
  );
}
