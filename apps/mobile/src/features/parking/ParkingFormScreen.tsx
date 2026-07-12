import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory, useParams } from 'react-router-dom';
import { closeCircle, imageOutline } from 'ionicons/icons';
import { uploadFormFile } from '@/components/forms/upload';
import { ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import {
  addParkingPhoto,
  createParking,
  getMyParking,
  publishParking,
  removeParkingPhoto,
  resolvePhotoUrl,
  unpublishParking,
  updateParking,
  type MyParking,
  type ParkingFormInput,
} from './parking.api';
import { parkingStatusLabel } from './status';

const EMPTY: ParkingFormInput = {
  title: '',
  description: '',
  address: '',
  latitude: 0,
  longitude: 0,
  pricePerDay: 0,
  accessInstructions: '',
};

/**
 * Alta / edición de una plaza (flujo host). `/tabs/host/parkings/new` crea;
 * `/tabs/host/parkings/:id` edita una existente, incluida la gestión de fotos
 * (adjuntar vía `storage` + posición por orden de subida) y el toggle
 * publicar/despublicar validado por el backend.
 */
export default function ParkingFormScreen() {
  const { id } = useParams<{ id: string }>();
  const isCreate = id === 'new';
  const history = useHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parking, setParking] = useState<MyParking | null>(null);
  const [form, setForm] = useState<ParkingFormInput>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    isCreate ? 'ready' : 'loading',
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (isCreate) return;
    setStatus('loading');
    const data = await getMyParking(id);
    if (!data) {
      setStatus('error');
      return;
    }
    setParking(data);
    setForm({
      title: data.title,
      description: data.description ?? '',
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      pricePerDay: data.pricePerDay,
      accessInstructions: data.accessInstructions ?? '',
    });
    setStatus('ready');
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function set<K extends keyof ParkingFormInput>(key: K, value: ParkingFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const result = isCreate
      ? await createParking(form)
      : await updateParking(id, form);
    setSaving(false);
    if (!result.data) {
      toast.error('No se pudo guardar la plaza', result.errorMessage);
      return;
    }
    toast.success('Plaza guardada');
    if (isCreate) {
      history.replace(`/tabs/host/parkings/${result.data.id}`);
    } else {
      setParking(result.data);
    }
  }

  async function handleTogglePublish() {
    if (!parking) return;
    setSaving(true);
    const updated =
      parking.status === 'PUBLISHED'
        ? await unpublishParking(parking.id)
        : await publishParking(parking.id);
    setSaving(false);
    if (!updated) {
      toast.error('No se pudo cambiar el estado de la plaza');
      return;
    }
    setParking(updated);
    toast.success(updated.status === 'PUBLISHED' ? 'Plaza publicada' : 'Plaza despublicada');
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    if (!parking) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      try {
        const ref = await uploadFormFile(file);
        if (!ref.id) throw new Error('missing file id');
        const updated = await addParkingPhoto(parking.id, ref.id);
        if (updated) setParking(updated);
      } catch {
        toast.error('No se pudo subir una foto');
      }
    }
    setUploading(false);
  }

  async function handleRemovePhoto(photoId: string) {
    if (!parking) return;
    const updated = await removeParkingPhoto(parking.id, photoId);
    if (updated) setParking(updated);
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/host" text="" />
          </IonButtons>
          <IonTitle>{isCreate ? 'Nueva plaza' : 'Editar plaza'}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={saving} onClick={handleSave}>
              {saving ? 'Guardando…' : 'Guardar'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {status === 'loading' ? (
          <SkeletonList rows={4} />
        ) : status === 'error' ? (
          <ErrorState message="No se pudo cargar la plaza." onRetry={load} />
        ) : (
          <>
            {parking ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <IonBadge color={parking.status === 'PUBLISHED' ? 'secondary' : 'medium'}>
                  {parkingStatusLabel(parking.status)}
                </IonBadge>
                <IonButton size="small" fill="outline" disabled={saving} onClick={handleTogglePublish}>
                  {parking.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                </IonButton>
              </div>
            ) : null}

            {!isCreate && parking ? (
              <>
                <p className="core-section-label">Fotos</p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20 }}>
                  {parking.photos.map((photo: { id: string; url: string }) => (
                    <div key={photo.id} style={{ position: 'relative', flex: '0 0 auto' }}>
                      <img
                        src={resolvePhotoUrl(photo.url)}
                        alt=""
                        style={{
                          width: 96,
                          height: 96,
                          objectFit: 'cover',
                          borderRadius: 10,
                        }}
                      />
                      <button
                        aria-label="Quitar foto"
                        onClick={() => void handleRemovePhoto(photo.id)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: 'var(--ion-background-color)',
                          borderRadius: '50%',
                          border: 'none',
                          lineHeight: 0,
                          padding: 0,
                        }}
                      >
                        <IonIcon
                          icon={closeCircle}
                          style={{ fontSize: 22, color: 'var(--ion-color-danger)' }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <IonInput
              className="core-field"
              value={form.title}
              onIonInput={(e) => set('title', String(e.detail.value ?? ''))}
              fill="outline"
              label="Título"
              labelPlacement="stacked"
              placeholder="Plaza P12 · Parking Recinto Norte"
            />
            <IonTextarea
              className="core-field"
              value={form.description}
              onIonInput={(e) => set('description', String(e.detail.value ?? ''))}
              fill="outline"
              label="Descripción"
              labelPlacement="stacked"
              autoGrow
              style={{ marginTop: 10 }}
            />
            <IonInput
              className="core-field"
              value={form.address}
              onIonInput={(e) => set('address', String(e.detail.value ?? ''))}
              fill="outline"
              label="Dirección"
              labelPlacement="stacked"
              style={{ marginTop: 10 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <IonInput
                className="core-field"
                type="number"
                value={form.latitude}
                onIonInput={(e) => set('latitude', Number(e.detail.value ?? 0))}
                fill="outline"
                label="Latitud"
                labelPlacement="stacked"
              />
              <IonInput
                className="core-field"
                type="number"
                value={form.longitude}
                onIonInput={(e) => set('longitude', Number(e.detail.value ?? 0))}
                fill="outline"
                label="Longitud"
                labelPlacement="stacked"
              />
            </div>
            <IonInput
              className="core-field"
              type="number"
              value={form.pricePerDay}
              onIonInput={(e) => set('pricePerDay', Number(e.detail.value ?? 0))}
              fill="outline"
              label="Precio por día (€)"
              labelPlacement="stacked"
              style={{ marginTop: 10 }}
            />
            <IonTextarea
              className="core-field"
              value={form.accessInstructions}
              onIonInput={(e) => set('accessInstructions', String(e.detail.value ?? ''))}
              fill="outline"
              label="Instrucciones de acceso"
              labelPlacement="stacked"
              autoGrow
              style={{ marginTop: 10 }}
            />

            {!isCreate ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFiles}
                />
                <IonButton
                  expand="block"
                  fill="outline"
                  style={{ marginTop: 16 }}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IonIcon icon={imageOutline} slot="start" aria-hidden="true" />
                  {uploading ? 'Subiendo…' : 'Añadir foto'}
                </IonButton>
              </>
            ) : null}
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
