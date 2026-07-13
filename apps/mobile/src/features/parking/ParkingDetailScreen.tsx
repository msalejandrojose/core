import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { carSportOutline, locationOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import {
  createReservation,
  getPublicParking,
  resolvePhotoUrl,
  type ParkingPublic,
} from './parking.api';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Ficha pública de una plaza (flujo huésped). Carga la plaza por id y resuelve
 * la reserva inline: el guest elige fechas, ve el importe calculado
 * (`pricePerDay × noches`) y confirma. El backend valida de nuevo el
 * anti-solape (fuente de verdad); aquí solo se calcula el importe a mostrar.
 */
export default function ParkingDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  const [parking, setParking] = useState<ParkingPublic | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setStatus('loading');
    const data = await getPublicParking(id);
    if (!data) {
      setStatus('error');
      return;
    }
    setParking(data);
    setStatus('ready');
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const nights =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / MS_PER_DAY)
      : 0;
  const total = parking && nights > 0 ? Math.round(parking.pricePerDay * nights * 100) / 100 : 0;

  async function handleReserve() {
    if (!parking || nights <= 0) return;
    setSubmitting(true);
    const { data, errorMessage } = await createReservation({
      parkingId: parking.id,
      startDate: checkIn,
      endDate: checkOut,
    });
    setSubmitting(false);
    if (!data) {
      toast.error('No se pudo reservar', errorMessage);
      return;
    }
    toast.success('Reserva creada', 'Queda pendiente de confirmación del host.');
    history.push(`/tabs/reservations/${data.id}`);
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/search" text="" />
          </IonButtons>
          <IonTitle>{parking?.title ?? 'Plaza'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {status === 'loading' ? (
          <SkeletonList rows={4} />
        ) : status === 'error' || !parking ? (
          <ErrorState message="No se pudo cargar la plaza." onRetry={load} />
        ) : (
          <>
            {parking.photoUrls.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  marginBottom: 16,
                  borderRadius: 14,
                }}
              >
                {parking.photoUrls.map((url: string) => (
                  <img
                    key={url}
                    src={resolvePhotoUrl(url)}
                    alt=""
                    style={{
                      width: 220,
                      height: 160,
                      objectFit: 'cover',
                      borderRadius: 14,
                      flex: '0 0 auto',
                    }}
                  />
                ))}
              </div>
            ) : (
              <div
                className="core-card"
                style={{
                  height: 160,
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: 16,
                }}
              >
                <IonIcon icon={carSportOutline} style={{ fontSize: 36, color: 'var(--core-muted)' }} />
              </div>
            )}

            <h1 className="core-title">{parking.title}</h1>
            <p
              className="core-subtitle"
              style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}
            >
              <IonIcon icon={locationOutline} aria-hidden="true" />
              {parking.address}
            </p>

            {parking.verified || parking.hostVerified ? (
              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                {parking.verified ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                      color: 'var(--ion-color-secondary)',
                    }}
                  >
                    <IonIcon icon={shieldCheckmarkOutline} aria-hidden="true" />
                    Plaza verificada
                  </span>
                ) : null}
                {parking.hostVerified ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                      color: 'var(--ion-color-secondary)',
                    }}
                  >
                    <IonIcon icon={shieldCheckmarkOutline} aria-hidden="true" />
                    Host verificado
                  </span>
                ) : null}
              </div>
            ) : null}

            {parking.description ? (
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ion-text-color)', marginTop: 16 }}>
                {parking.description}
              </p>
            ) : null}

            <div className="core-card" style={{ marginTop: 20 }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                {parking.pricePerDay}€{' '}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--core-muted)' }}>/ día</span>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
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

              {nights > 0 ? (
                <p style={{ fontSize: 14, color: 'var(--core-muted)', marginTop: 12 }}>
                  {parking.pricePerDay}€ × {nights} {nights === 1 ? 'día' : 'días'} ={' '}
                  <strong style={{ color: 'var(--ion-text-color)' }}>{total}€</strong>
                </p>
              ) : null}

              <IonButton
                expand="block"
                style={{ marginTop: 12 }}
                disabled={nights <= 0 || submitting}
                onClick={handleReserve}
              >
                {submitting ? 'Reservando…' : 'Reservar esta plaza'}
              </IonButton>
              <p style={{ fontSize: 12, color: 'var(--core-muted)', textAlign: 'center', marginTop: 8 }}>
                No se te cobrará todavía. El host confirma la reserva.
              </p>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
