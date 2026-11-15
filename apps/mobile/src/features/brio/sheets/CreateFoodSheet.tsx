import { useEffect, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { brioApi, isApiError, type Food } from '../api';
import { tapSuccess } from '../haptics';
import { SectionHeader, SheetBar, Switch } from '../ui/kit';
import { toast } from '@/lib/toast';
import './sheets.css';

interface CreateFoodSheetProps {
  isOpen: boolean;
  /** Nombre de partida: lo que se estaba buscando. */
  initialName: string;
  onClose: () => void;
  onCreated: (food: Food) => void;
}

const toNumber = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));
const clean = (v: string) => v.replace(/[^\d.,]/g, '');

const NUTRIENTS = [
  { key: 'kcal', label: 'Calorías', unit: 'kcal', max: 900 },
  { key: 'protein', label: 'Proteína', unit: 'g', max: 100 },
  { key: 'carbs', label: 'Hidratos', unit: 'g', max: 100 },
  { key: 'fat', label: 'Grasas', unit: 'g', max: 100 },
] as const;
type NutrientKey = (typeof NUTRIENTS)[number]['key'];

/**
 * Alimento propio: lo que no está en el catálogo (la receta de casa, una marca
 * del súper). Se copian los valores por 100 g de la etiqueta y, si se quiere,
 * una ración («1 tarro, 125 g»). Solo lo ve quien lo crea.
 */
export function CreateFoodSheet({ isOpen, initialName, onClose, onCreated }: CreateFoodSheetProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [liquid, setLiquid] = useState(false);
  const [values, setValues] = useState<Record<NutrientKey, string>>({ kcal: '', protein: '', carbs: '', fat: '' });
  const [servingLabel, setServingLabel] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setBrand('');
    setLiquid(false);
    setValues({ kcal: '', protein: '', carbs: '', fat: '' });
    setServingLabel('');
    setServingGrams('');
  }, [isOpen, initialName]);

  const nums = Object.fromEntries(
    NUTRIENTS.map((n) => [n.key, values[n.key].trim() === '' && n.key !== 'kcal' ? 0 : toNumber(values[n.key])]),
  ) as Record<NutrientKey, number>;
  const nutrientsOk = NUTRIENTS.every((n) => Number.isFinite(nums[n.key]) && nums[n.key] >= 0 && nums[n.key] <= n.max);
  const sg = toNumber(servingGrams);
  const hasServing = servingLabel.trim() !== '' || servingGrams.trim() !== '';
  const servingOk = !hasServing || (servingLabel.trim() !== '' && Number.isFinite(sg) && sg > 0 && sg <= 5000);
  const valid = name.trim().length > 1 && nutrientsOk && servingOk;
  const unit = liquid ? 'ml' : 'g';

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      const food = await brioApi.createFood({
        name: name.trim(),
        ...(brand.trim() ? { brand: brand.trim() } : {}),
        isLiquid: liquid,
        kcalPer100: nums.kcal,
        proteinPer100G: nums.protein,
        carbsPer100G: nums.carbs,
        fatPer100G: nums.fat,
        ...(hasServing ? { servings: [{ label: servingLabel.trim(), grams: sg, isDefault: true }] } : {}),
      });
      void tapSuccess();
      toast.success('Alimento creado', 'Ya lo tienes en tus búsquedas.');
      onCreated(food);
    } catch (e) {
      toast.error('No se pudo crear', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="rk-modal-full">
      <IonContent>
        <div className="rk-sheet">
          <span className="rk-grab" aria-hidden="true" />
          <SheetBar
            title="Nuevo alimento"
            onCancel={onClose}
            action={{ label: 'Crear', onClick: () => void save(), disabled: !valid || saving }}
          />

          <div className="rk-list">
            <label className="rk-row mealedit__text">
              <span className="rk-visually-hidden">Nombre</span>
              <input type="text" value={name} maxLength={150} placeholder="Nombre" onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="rk-row mealedit__text">
              <span className="rk-visually-hidden">Marca</span>
              <input
                type="text"
                value={brand}
                maxLength={100}
                placeholder="Marca (opcional)"
                onChange={(e) => setBrand(e.target.value)}
              />
            </label>
            <button type="button" className="rk-row" aria-pressed={liquid} onClick={() => setLiquid((l) => !l)}>
              <span className="rk-row__main rk-row__title">Es una bebida</span>
              <Switch on={liquid} />
            </button>
          </div>

          <section className="rk-section" aria-labelledby="por100">
            <SectionHeader id="por100">Por cada 100 {unit}</SectionHeader>
            <div className="rk-list">
              {NUTRIENTS.map((n) => (
                <div key={n.key} className="rk-row workout__row">
                  <span className="rk-row__main rk-row__title">{n.label}</span>
                  <label className="workout__num">
                    <span className="rk-visually-hidden">{`${n.label} por 100 ${unit}`}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={values[n.key]}
                      placeholder={n.key === 'kcal' ? '' : '0'}
                      onChange={(e) => setValues((v) => ({ ...v, [n.key]: clean(e.target.value) }))}
                    />
                  </label>
                  <span className="workout__unit">{n.unit}</span>
                </div>
              ))}
            </div>
            <p className="rk-note">Cópialo de la etiqueta: la tabla nutricional viene por 100 {unit}.</p>
          </section>

          <section className="rk-section" aria-labelledby="racion">
            <SectionHeader id="racion">Ración (opcional)</SectionHeader>
            <div className="rk-list">
              <label className="rk-row mealedit__text">
                <span className="rk-visually-hidden">Nombre de la ración</span>
                <input
                  type="text"
                  value={servingLabel}
                  maxLength={60}
                  placeholder="Por ejemplo, 1 tarro"
                  onChange={(e) => setServingLabel(e.target.value)}
                />
              </label>
              <div className="rk-row workout__row">
                <span className="rk-row__main rk-row__title">Pesa</span>
                <label className="workout__num">
                  <span className="rk-visually-hidden">{`Gramos de la ración`}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={servingGrams}
                    onChange={(e) => setServingGrams(clean(e.target.value))}
                  />
                </label>
                <span className="workout__unit">{unit}</span>
              </div>
            </div>
          </section>
        </div>
      </IonContent>
    </IonModal>
  );
}
