import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonModal } from '@ionic/react';
import { digestionApi, notifyDigestionChanged } from '../progress/digestion.api';
import { tapSuccess } from '../haptics';
import { BristolIcon } from '../ui/bristol-icons';
import { BRISTOL_LABELS } from '../ui/bristol-icons.data';
import { SheetBar } from '../ui/kit';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import './sheets.css';

const TYPES = [1, 2, 3, 4, 5, 6, 7];

/** Los 7 tipos con su dibujo. Tocar uno es elegirlo. */
export function BristolPicker({
  onPick,
  disabled,
  selected,
}: {
  onPick: (type: number) => void;
  disabled?: boolean;
  selected?: number | null;
}) {
  return (
    <div className="bristol__grid" role="group" aria-label="Tipo de la escala de Bristol">
      {TYPES.map((t) => (
        <button
          key={t}
          type="button"
          className="bristol__opt"
          aria-pressed={selected === t}
          aria-label={`Tipo ${t}, ${BRISTOL_LABELS[t]}`}
          disabled={disabled}
          onClick={() => onPick(t)}
        >
          <BristolIcon type={t} size={52} />
          <span className="bristol__n">{t}</span>
          <span className="bristol__label">{BRISTOL_LABELS[t]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Registrar una deposición desde el +: un toque en el dibujo y queda apuntada
 * ahora, con Deshacer. Lo demás (histórico, borrar) está en Progreso › Digestión.
 */
export function DigestionSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const history = useHistory();
  const [saving, setSaving] = useState(false);

  async function pick(type: number) {
    setSaving(true);
    try {
      const created = await digestionApi.log({ bristolType: type, amount: 'NORMAL' });
      void tapSuccess();
      notifyDigestionChanged();
      onClose();
      snackbar.undo(`Apuntado · tipo ${type}, ${BRISTOL_LABELS[type].toLowerCase()}`, async () => {
        await digestionApi.remove(created.id);
        notifyDigestionChanged();
      });
    } catch {
      toast.error('No se pudo registrar');
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
        <SheetBar title="Digestión" onCancel={onClose} />
        <span className="register__hint">Toca cómo ha sido y queda apuntado</span>
        <BristolPicker onPick={(t) => void pick(t)} disabled={saving} />
        <button
          type="button"
          className="rk-textbtn bristol__more"
          onClick={() => {
            onClose();
            history.push('/tabs/progress/digestion');
          }}
        >
          Ver histórico
        </button>
      </div>
    </IonModal>
  );
}
