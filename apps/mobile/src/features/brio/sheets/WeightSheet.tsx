import { useEffect, useState } from 'react';
import { IonModal } from '@ionic/react';
import { isApiError, brioApi } from '../api';
import { formatNumber, formatWeight } from '../format';
import { useBrioStore } from '../brio.store';
import { tapSuccess } from '../haptics';
import { SheetBar } from '../ui/kit';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import './sheets.css';

interface WeightSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Peso de hoy (lienzo "Registrar", hoja de peso): parte del último peso y se
 * ajusta de 100 en 100 gramos, que es como se lee una báscula, sin teclado.
 */
export function WeightSheet({ isOpen, onClose }: WeightSheetProps) {
  const day = useBrioStore((s) => s.day);
  const profile = useBrioStore((s) => s.profile);
  const loadProfile = useBrioStore((s) => s.loadProfile);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const last = profile?.currentWeightKg ?? null;
  const [weight, setWeight] = useState(last ?? 75);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setWeight(last ?? 75);
  }, [isOpen, last]);

  const step = (delta: number) =>
    setWeight((w) => Math.min(400, Math.max(25, Math.round((w + delta) * 10) / 10)));

  async function save() {
    setSaving(true);
    try {
      await brioApi.logWeight({ weightKg: weight, measuredOn: day });
      await Promise.all([loadProfile(), refreshDay()]);
      void tapSuccess();
      // Sin "Deshacer": la API no borra pesadas y otra del mismo día la sustituye.
      snackbar.show(`Peso guardado · ${formatWeight(weight)}`);
      onClose();
    } catch (e) {
      toast.error('No se pudo guardar el peso', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      className="brio-sheet-auto"
      initialBreakpoint={1}
      breakpoints={[0, 1]}
      handle
    >
      <div className="rk-sheet">
        <SheetBar title="Peso de hoy" onCancel={onClose} />
        <div className="weight__card">
          <button type="button" className="weight__step" aria-label="Restar 100 gramos" onClick={() => step(-0.1)}>
            −
          </button>
          <span className="weight__value" aria-live="polite">
            {formatNumber(weight, 1)}
            <span> kg</span>
          </span>
          <button type="button" className="weight__step" aria-label="Sumar 100 gramos" onClick={() => step(0.1)}>
            +
          </button>
        </div>
        <span className="weight__note">
          {last !== null ? `Último registro: ${formatWeight(last)}` : 'Tu primer registro de peso'}
        </span>
        <button type="button" className="rk-btn" disabled={saving} onClick={() => void save()}>
          Guardar
        </button>
      </div>
    </IonModal>
  );
}
