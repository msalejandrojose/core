import { useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { addOutline, searchOutline } from 'ionicons/icons';
import { useSearchPlaces, type PlaceCandidate } from './use-search-places';
import { useAddSite } from './use-add-site';
import { useCurrentLocation } from './use-current-location';
import { LocationPickerMap, type LatLng } from './LocationPickerMap';
import { TagInput } from './TagInput';
import {
  SITE_CATEGORIES,
  SITE_CATEGORY_ICON,
  SITE_CATEGORY_LABEL,
  type SiteCategory,
} from './site-category';
import { EmptyState } from '@/components/ux';
import { toast } from '@/lib/toast';

type EntryStatus = 'WANT_TO_GO' | 'VISITED';

/**
 * Añadir un sitio (TASK-181): buscador contra el proveedor externo
 * (`GET /andanzas/sites/search`, Mapbox) con fallback a creación manual con
 * pin en el mapa. Ambos caminos convergen en el mismo formulario de detalle
 * (categoría + tags + quiero-ir/ya-fui) y el mismo `useAddSite`.
 */
export default function AddSitePage() {
  const router = useIonRouter();
  const [query, setQuery] = useState('');
  const [candidate, setCandidate] = useState<PlaceCandidate | null>(null);
  const [manual, setManual] = useState(false);
  const { results, loading: searching, error: searchError } = useSearchPlaces(query);

  const detailOpen = candidate !== null || manual;

  function backToSearch() {
    setCandidate(null);
    setManual(false);
  }

  if (!detailOpen) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/tabs/list" text="" />
            </IonButtons>
            <IonTitle>Añadir sitio</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonInput
            className="core-field"
            label="Buscar"
            labelPlacement="stacked"
            fill="outline"
            placeholder="Nombre del sitio…"
            value={query}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
            style={{ marginBottom: 16 }}
          />

          {searching ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <IonSpinner name="crescent" />
            </div>
          ) : searchError ? (
            <IonNote color="danger">{searchError}</IonNote>
          ) : results.length > 0 ? (
            <IonList inset className="core-group">
              {results.map((r) => (
                <IonItem
                  key={r.externalPlaceId}
                  button
                  detail
                  lines="inset"
                  onClick={() => setCandidate(r)}
                >
                  <IonLabel>
                    <div>{r.name}</div>
                    {r.address ? (
                      <div style={{ fontSize: 13, color: 'var(--core-muted)' }}>
                        {r.address}
                      </div>
                    ) : null}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          ) : query.trim().length >= 2 ? (
            <EmptyState
              icon={searchOutline}
              title="Sin resultados"
              description="Prueba con otro nombre, o añádelo a mano."
            />
          ) : null}

          <IonButton
            expand="block"
            fill="outline"
            style={{ marginTop: 24 }}
            onClick={() => setManual(true)}
          >
            <IonIcon icon={addOutline} slot="start" />
            No lo encuentro, añadir a mano
          </IonButton>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <AddSiteDetail
      candidate={candidate}
      onBack={backToSearch}
      onDone={() => {
        toast.success('Sitio añadido');
        router.push('/tabs/list', 'back');
      }}
    />
  );
}

function AddSiteDetail({
  candidate,
  onBack,
  onDone,
}: {
  candidate: PlaceCandidate | null;
  onBack: () => void;
  onDone: () => void;
}) {
  const { center: initialCenter } = useCurrentLocation();
  const { submit, loading, error } = useAddSite();

  const [name, setName] = useState(candidate?.name ?? '');
  const [category, setCategory] = useState<SiteCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<EntryStatus>('WANT_TO_GO');
  const [pin, setPin] = useState<LatLng>(
    candidate ? { lat: candidate.latitude, lng: candidate.longitude } : initialCenter,
  );

  async function onSubmit() {
    if (!name.trim() || !category) return;
    const ok = await submit({
      name: name.trim(),
      category,
      latitude: candidate ? candidate.latitude : pin.lat,
      longitude: candidate ? candidate.longitude : pin.lng,
      address: candidate?.address ?? undefined,
      externalPlaceId: candidate?.externalPlaceId,
      tagNames: tags,
      status,
    });
    if (ok) onDone();
  }

  const canSubmit = name.trim().length > 0 && category !== null && !loading;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onBack}>Atrás</IonButton>
          </IonButtons>
          <IonTitle>Añadir sitio</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {candidate ? (
          <IonInput
            className="core-field"
            label="Nombre"
            labelPlacement="stacked"
            fill="outline"
            value={name}
            onIonInput={(e) => setName(e.detail.value ?? '')}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <>
            <LocationPickerMap center={pin} onChange={setPin} />
            <p
              className="core-subtitle"
              style={{ margin: '8px 4px 16px', fontSize: 13 }}
            >
              Mueve el mapa para colocar el pin en el sitio.
            </p>
            <IonInput
              className="core-field"
              label="Nombre"
              labelPlacement="stacked"
              fill="outline"
              placeholder="Nombre del sitio"
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? '')}
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        <p className="core-section-label">Categoría</p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {SITE_CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <IonButton
                key={c}
                fill={selected ? 'solid' : 'outline'}
                color={selected ? 'primary' : 'medium'}
                size="small"
                onClick={() => setCategory(c)}
              >
                <IonIcon icon={SITE_CATEGORY_ICON[c]} slot="start" />
                {SITE_CATEGORY_LABEL[c]}
              </IonButton>
            );
          })}
        </div>

        <div style={{ marginBottom: 20 }}>
          <TagInput value={tags} onChange={setTags} />
        </div>

        <p className="core-section-label">¿Quiero ir o ya fui?</p>
        <IonSegment
          value={status}
          onIonChange={(e) => setStatus(e.detail.value as EntryStatus)}
          style={{ marginBottom: 24 }}
        >
          <IonSegmentButton value="WANT_TO_GO">
            <IonLabel>Quiero ir</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="VISITED">
            <IonLabel>Ya fui</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {error ? (
          <IonNote color="danger" style={{ display: 'block', marginBottom: 12 }}>
            {error}
          </IonNote>
        ) : null}

        <IonButton expand="block" disabled={!canSubmit} onClick={() => void onSubmit()}>
          {loading ? <IonSpinner name="crescent" /> : 'Guardar'}
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
