import { useCallback, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonThumbnail,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { carSportOutline, searchOutline } from 'ionicons/icons';
import { CursorList, useCursorList, type CursorFetcher } from '@/components/list';
import {
  resolvePhotoUrl,
  searchParkingsFetcher,
  type ParkingSummary,
} from './parking.api';

function ParkingRow({ parking }: { parking: ParkingSummary }) {
  const history = useHistory();
  return (
    <IonItem
      button
      detail
      lines="inset"
      onClick={() => history.push(`/tabs/search/p/${parking.id}`)}
    >
      <IonThumbnail slot="start">
        {parking.coverPhotoUrl ? (
          <img
            src={resolvePhotoUrl(parking.coverPhotoUrl)}
            alt=""
            style={{ borderRadius: 10, objectFit: 'cover' }}
          />
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
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ion-color-primary)',
            marginTop: 4,
          }}
        >
          {parking.pricePerDay}€ <span style={{ fontWeight: 400, color: 'var(--core-muted)' }}>/ día</span>
        </div>
      </IonLabel>
    </IonItem>
  );
}

/**
 * Buscador público de plazas (flujo huésped, tab raíz "Buscar"). Filtros de
 * ubicación + fechas sobre el listado paginado (`CursorList`, MOB-09); tocar
 * una fila navega a la ficha (`ParkingDetailScreen`), que gestiona la reserva.
 */
export default function SearchScreen() {
  const [where, setWhere] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const fetcher = useCallback<CursorFetcher<ParkingSummary>>(
    (page) => searchParkingsFetcher({ q: where, startDate: checkIn, endDate: checkOut })(page),
    // Cerrado deliberadamente sobre los filtros actuales; `reload()` se llama
    // explícitamente al pulsar "Buscar" (submit-triggered, no en cada tecla).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { items, status, hasMore, reload, loadMore } = useCursorList<ParkingSummary>(fetcher, {
    limit: 20,
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Buscar plaza</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ padding: '12px 16px 4px' }} className="core-card">
          <IonInput
            className="core-field"
            value={where}
            placeholder="Estadio, barrio o dirección"
            onIonInput={(e) => setWhere(String(e.detail.value ?? ''))}
            fill="outline"
            label="Dónde"
            labelPlacement="stacked"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <IonInput
              className="core-field"
              type="date"
              value={checkIn}
              onIonInput={(e) => setCheckIn(String(e.detail.value ?? ''))}
              fill="outline"
              label="Entrada"
              labelPlacement="stacked"
            />
            <IonInput
              className="core-field"
              type="date"
              value={checkOut}
              onIonInput={(e) => setCheckOut(String(e.detail.value ?? ''))}
              fill="outline"
              label="Salida"
              labelPlacement="stacked"
            />
          </div>
          <IonButton expand="block" onClick={() => void reload()} style={{ marginTop: 12 }}>
            <IonIcon icon={searchOutline} slot="start" aria-hidden="true" />
            Buscar
          </IonButton>
        </div>

        <CursorList
          items={items}
          status={status}
          hasMore={hasMore}
          onReload={reload}
          onLoadMore={loadMore}
          keyFor={(p) => p.id}
          emptyIcon={carSportOutline}
          emptyTitle="No hay plazas con esos filtros."
          emptyDescription="Prueba a cambiar la ubicación o las fechas."
          errorMessage="No se pudo cargar el buscador."
          renderItem={(p) => <ParkingRow parking={p} />}
        />
      </IonContent>
    </IonPage>
  );
}
