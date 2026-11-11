import { useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { isApiError, nutreApi } from './api';
import { useNutreStore } from './nutre.store';
import { tapSuccess } from './haptics';
import { toast } from '@/lib/toast';

interface LogWeightSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Registrar una pesada. Bottom sheet y no página (DS §1b): es un formulario de
 * un campo y abrir una pantalla entera para esto rompe el flujo.
 *
 * Guardar aquí tiene efectos en el servidor (recalcula los targets del perfil),
 * así que al cerrar se recargan perfil y día en vez de actualizar el estado a
 * mano: el objetivo nuevo lo calcula la API, no el cliente.
 */
export function LogWeightSheet({ isOpen, onClose }: LogWeightSheetProps) {
  const day = useNutreStore((s) => s.day);
  const loadProfile = useNutreStore((s) => s.loadProfile);
  const refreshDay = useNutreStore((s) => s.refreshDay);
  const currentWeight = useNutreStore((s) => s.profile?.currentWeightKg);

  const [weight, setWeight] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const parsed = Number(weight.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed >= 25 && parsed <= 400;

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      const fat = Number(bodyFat.replace(',', '.'));
      await nutreApi.logWeight({
        weightKg: parsed,
        measuredOn: day,
        bodyFatPct: Number.isFinite(fat) && fat > 0 ? fat : undefined,
      });
      await Promise.all([loadProfile(), refreshDay()]);
      void tapSuccess();
      toast.success('Peso registrado');
      setWeight('');
      setBodyFat('');
      onClose();
    } catch (e) {
      toast.error(
        'No se pudo registrar el peso',
        isApiError(e) ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.5}
      breakpoints={[0, 0.5]}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Peso</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="core-section-label">Peso de hoy</p>
        <div className="core-group" style={{ padding: 8 }}>
          <IonInput
            className="core-field"
            type="number"
            inputMode="decimal"
            label="kg"
            labelPlacement="end"
            placeholder={
              currentWeight ? currentWeight.toFixed(1) : '80.0'
            }
            value={weight}
            onIonInput={(e) => setWeight(String(e.detail.value ?? ''))}
          />
        </div>

        <p className="core-section-label" style={{ marginTop: 24 }}>
          Grasa corporal (opcional)
        </p>
        <div className="core-group" style={{ padding: 8 }}>
          <IonInput
            className="core-field"
            type="number"
            inputMode="decimal"
            label="%"
            labelPlacement="end"
            placeholder="18.5"
            value={bodyFat}
            onIonInput={(e) => setBodyFat(String(e.detail.value ?? ''))}
          />
        </div>

        <IonButton
          expand="block"
          style={{ marginTop: 28 }}
          disabled={!valid || saving}
          onClick={() => void save()}
        >
          Guardar
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
