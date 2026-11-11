import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { barbellOutline } from 'ionicons/icons';
import {
  isApiError,
  nutreApi,
  type ActivityType,
  type Effort,
} from './api';
import { useNutreStore } from './nutre.store';
import { tapSuccess } from './haptics';
import { ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';

interface LogActivitySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const EFFORTS: { value: Effort; label: string }[] = [
  { value: 'LIGHT', label: 'Suave' },
  { value: 'MODERATE', label: 'Normal' },
  { value: 'VIGOROUS', label: 'Fuerte' },
];

const DURATION_PRESETS = [15, 30, 45, 60];

/**
 * Registrar un entreno: tipo de actividad, duración y esfuerzo.
 *
 * Las kcal no se piden ni se calculan en el cliente — las estima la API con el
 * MET del tipo y el peso actual. Si el usuario no se ha pesado nunca, la API
 * responde `NUTRE_WEIGHT_UNKNOWN` y aquí se traduce a un aviso que le manda a
 * registrar el peso, en vez de a un error genérico.
 */
export function LogActivitySheet({ isOpen, onClose }: LogActivitySheetProps) {
  const day = useNutreStore((s) => s.day);
  const refreshDay = useNutreStore((s) => s.refreshDay);

  const [types, setTypes] = useState<ActivityType[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState('30');
  const [effort, setEffort] = useState<Effort>('MODERATE');
  const [saving, setSaving] = useState(false);

  const loadTypes = () => {
    setFailed(false);
    nutreApi
      .activityTypes()
      .then(setTypes)
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    if (isOpen && types === null && !failed) loadTypes();
  }, [isOpen, types, failed]);

  const parsedMinutes = Number(minutes.replace(',', '.'));
  const valid =
    typeId !== null && Number.isFinite(parsedMinutes) && parsedMinutes > 0;

  async function save() {
    if (!typeId || !valid) return;
    setSaving(true);
    try {
      await nutreApi.logActivity({
        activityTypeId: typeId,
        // El día visible puede no ser hoy (se puede rellenar ayer), así que la
        // hora de inicio se ancla a mediodía de ESE día: sin hora real, el
        // mediodía evita que el huso lo empuje al día anterior o siguiente.
        startedAt: new Date(`${day}T12:00:00.000Z`).toISOString(),
        durationSec: Math.round(parsedMinutes * 60),
        effort,
      });
      await refreshDay();
      void tapSuccess();
      toast.success('Actividad registrada');
      onClose();
    } catch (e) {
      if (isApiError(e) && e.code === 'NUTRE_WEIGHT_UNKNOWN') {
        toast.warning('Falta tu peso', e.message);
      } else {
        toast.error(
          'No se pudo registrar la actividad',
          isApiError(e) ? e.message : undefined,
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.92}
      breakpoints={[0, 0.92]}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Añadir actividad</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="core-section-label">Actividad</p>
        {failed ? (
          <ErrorState
            message="No se pudo cargar el catálogo de actividades."
            onRetry={loadTypes}
          />
        ) : types === null ? (
          <SkeletonList rows={4} />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}
          >
            {types.map((type) => {
              const active = type.id === typeId;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setTypeId(type.id)}
                  className="core-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    minHeight: 56,
                    border: active
                      ? '1.5px solid var(--ion-color-primary)'
                      : '0.5px solid var(--core-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span className="core-tint-icon">
                    <IonIcon icon={barbellOutline} aria-hidden="true" />
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      color: 'var(--ion-text-color)',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {type.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p className="core-section-label" style={{ marginTop: 24 }}>
          Duración
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {DURATION_PRESETS.map((preset) => (
            <IonButton
              key={preset}
              size="small"
              fill={Number(minutes) === preset ? 'solid' : 'outline'}
              onClick={() => setMinutes(String(preset))}
            >
              {preset} min
            </IonButton>
          ))}
        </div>
        <div className="core-group" style={{ padding: 8 }}>
          <IonInput
            className="core-field"
            type="number"
            inputMode="numeric"
            label="min"
            labelPlacement="end"
            value={minutes}
            onIonInput={(e) => setMinutes(String(e.detail.value ?? ''))}
          />
        </div>

        <p className="core-section-label" style={{ marginTop: 24 }}>
          Esfuerzo
        </p>
        <IonSegment
          className="core-segment"
          value={effort}
          onIonChange={(e) => setEffort(e.detail.value as Effort)}
        >
          {EFFORTS.map((option) => (
            <IonSegmentButton key={option.value} value={option.value}>
              {option.label}
            </IonSegmentButton>
          ))}
        </IonSegment>

        <IonButton
          expand="block"
          style={{ marginTop: 28 }}
          disabled={!valid || saving}
          onClick={() => void save()}
        >
          Guardar actividad
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
