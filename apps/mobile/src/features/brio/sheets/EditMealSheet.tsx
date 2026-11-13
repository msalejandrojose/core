import { useEffect, useState } from 'react';
import { IonModal, useIonAlert } from '@ionic/react';
import { brioApi, isApiError, type MealEntry, type MealType } from '../api';
import { MEAL_ORDER, formatKcal, mealLabel } from '../format';
import { tapSuccess } from '../haptics';
import { Segmented, SheetBar } from '../ui/kit';
import { toast } from '@/lib/toast';
import './sheets.css';

interface EditMealSheetProps {
  entry: MealEntry | null;
  onClose: () => void;
  /** Tras guardar o borrar, para refrescar el día. */
  onChanged: () => void | Promise<void>;
}

const toNumber = (v: string) => Number(v.replace(',', '.'));

/**
 * Corregir algo ya apuntado: la cantidad y el momento del día. Si fue un
 * registro rápido («menú del día, 700 kcal»), también el nombre y las kcal.
 * Con un alimento del catálogo las kcal se recalculan solas con la cantidad.
 */
export function EditMealSheet({ entry, onClose, onChanged }: EditMealSheetProps) {
  const [mealType, setMealType] = useState<MealType>('BREAKFAST');
  const [grams, setGrams] = useState('');
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm] = useIonAlert();

  useEffect(() => {
    if (!entry) return;
    setMealType(entry.mealType);
    setGrams(String(Math.round(entry.quantityG)));
    setName(entry.name);
    setKcal(String(Math.round(entry.kcal)));
  }, [entry]);

  const fromCatalog = !!entry?.foodId;
  const g = toNumber(grams);
  const k = toNumber(kcal);
  const validGrams = Number.isFinite(g) && g >= 1 && g <= 10000;
  const validKcal = Number.isFinite(k) && k >= 0 && k <= 10000;
  const valid = fromCatalog ? validGrams : validKcal && name.trim().length > 0;
  const preview =
    entry && fromCatalog && validGrams && entry.quantityG > 0 ? (entry.kcal * g) / entry.quantityG : null;

  async function save() {
    if (!entry || !valid) return;
    setSaving(true);
    try {
      await brioApi.updateMeal(
        entry.id,
        fromCatalog ? { mealType, quantityG: g } : { mealType, name: name.trim(), kcal: k },
      );
      await onChanged();
      void tapSuccess();
      toast.success('Cambios guardados');
      onClose();
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!entry) return;
    void confirm({
      header: `¿Borrar «${entry.name}»?`,
      message: 'Se quita del diario de ese día.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            brioApi
              .deleteMeal(entry.id)
              .then(async () => {
                await onChanged();
                toast.success('Borrado');
                onClose();
              })
              .catch(() => toast.error('No se pudo borrar'));
          },
        },
      ],
    });
  }

  return (
    <IonModal
      isOpen={entry !== null}
      onDidDismiss={onClose}
      className="brio-sheet-auto"
      initialBreakpoint={1}
      breakpoints={[0, 1]}
      handle
    >
      <div className="rk-sheet">
        <SheetBar
          title="Editar"
          onCancel={onClose}
          action={{ label: 'Guardar', onClick: () => void save(), disabled: !valid || saving }}
        />
        {entry ? (
          <>
            <div className="rk-list">
              {fromCatalog ? (
                <>
                  <div className="rk-row">
                    <span className="rk-row__main">
                      <span className="rk-row__title">{entry.name}</span>
                      <span className="rk-row__sub">Las kcal se recalculan con la cantidad</span>
                    </span>
                    <span className="rk-row__value">{formatKcal(preview ?? entry.kcal)} kcal</span>
                  </div>
                  <div className="rk-row workout__row">
                    <span className="rk-row__main rk-row__title">Cantidad</span>
                    <label className="workout__num">
                      <span className="rk-visually-hidden">Cantidad en gramos</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={grams}
                        onChange={(e) => setGrams(e.target.value.replace(/[^\d.,]/g, ''))}
                      />
                    </label>
                    <span className="workout__unit">g</span>
                  </div>
                </>
              ) : (
                <>
                  <label className="rk-row mealedit__text">
                    <span className="rk-visually-hidden">Nombre</span>
                    <input
                      type="text"
                      value={name}
                      maxLength={200}
                      placeholder="Qué has comido"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <div className="rk-row workout__row">
                    <span className="rk-row__main rk-row__title">Calorías</span>
                    <label className="workout__num">
                      <span className="rk-visually-hidden">Kilocalorías</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={kcal}
                        onChange={(e) => setKcal(e.target.value.replace(/[^\d.,]/g, ''))}
                      />
                    </label>
                    <span className="workout__unit">kcal</span>
                  </div>
                </>
              )}
            </div>

            <div className="rk-section">
              <Segmented
                label="Comida del día"
                small
                value={mealType}
                onChange={setMealType}
                options={MEAL_ORDER.map((t) => ({ value: t, label: mealLabel(t) }))}
              />
            </div>

            <button type="button" className="mealedit__delete" onClick={remove}>
              Borrar
            </button>
          </>
        ) : null}
      </div>
    </IonModal>
  );
}
