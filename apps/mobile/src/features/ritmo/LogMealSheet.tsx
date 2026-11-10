import { useEffect, useRef, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { isApiError, ritmoApi, type Food, type MealType } from './api';
import { MEAL_ORDER, formatKcal, mealLabel } from './format';
import { useRitmoStore } from './ritmo.store';
import { tapSuccess } from './haptics';
import { EmptyState } from '@/components/ux';
import { toast } from '@/lib/toast';

interface LogMealSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Comida preseleccionada al abrir desde una sección del diario. */
  initialMealType?: MealType;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Registrar comida. Dos caminos en el mismo sheet, porque son el mismo gesto
 * para el usuario:
 *
 *  1. Buscar en el catálogo y elegir cantidad (lo preciso).
 *  2. Registro rápido: nombre libre + kcal (lo que salva el día cuando comes
 *     fuera y no vas a pesar nada).
 *
 * Las kcal del camino 1 NO se calculan aquí: se mandan `foodId` y cantidad y es
 * la API la que escala y guarda el snapshot. Duplicar la fórmula en el cliente
 * sería la forma más fácil de que el diario y el servidor dejen de cuadrar.
 */
export function LogMealSheet({
  isOpen,
  onClose,
  initialMealType = 'LUNCH',
}: LogMealSheetProps) {
  const refreshDay = useRitmoStore((s) => s.refreshDay);

  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [quickKcal, setQuickKcal] = useState('');
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) setMealType(initialMealType);
  }, [isOpen, initialMealType]);

  // Búsqueda con debounce: el usuario escribe "pollo" y no queremos cinco
  // requests por el camino.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(() => {
      ritmoApi
        .searchFoods(term)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  function reset() {
    setQuery('');
    setResults([]);
    setSelected(null);
    setQuantity('100');
    setQuickKcal('');
  }

  const parsedQuantity = Number(quantity.replace(',', '.'));
  const parsedKcal = Number(quickKcal.replace(',', '.'));
  const canSaveCatalog =
    selected !== null && Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const canSaveQuick =
    selected === null &&
    query.trim().length > 1 &&
    Number.isFinite(parsedKcal) &&
    parsedKcal > 0;

  async function save() {
    setSaving(true);
    try {
      await ritmoApi.logMeal(
        selected
          ? { mealType, foodId: selected.id, quantity: parsedQuantity }
          : {
              mealType,
              customName: query.trim(),
              quantity: parsedQuantity > 0 ? parsedQuantity : 1,
              kcal: parsedKcal,
            },
      );
      await refreshDay();
      void tapSuccess();
      toast.success('Comida registrada');
      reset();
      onClose();
    } catch (e) {
      toast.error(
        'No se pudo registrar la comida',
        isApiError(e) ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  /** Estimación solo informativa; la cifra que se guarda la calcula la API. */
  const preview =
    selected && Number.isFinite(parsedQuantity)
      ? Math.round((selected.kcalPer100 * parsedQuantity) / 100)
      : null;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={() => {
        reset();
        onClose();
      }}
      initialBreakpoint={0.92}
      breakpoints={[0, 0.92]}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Añadir comida</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonSegment
          className="core-segment"
          value={mealType}
          onIonChange={(e) => setMealType(e.detail.value as MealType)}
        >
          {MEAL_ORDER.map((type) => (
            <IonSegmentButton key={type} value={type}>
              {mealLabel(type)}
            </IonSegmentButton>
          ))}
        </IonSegment>

        <p className="core-section-label" style={{ marginTop: 24 }}>
          Alimento
        </p>
        <div className="core-group" style={{ padding: 8 }}>
          <IonInput
            className="core-field"
            placeholder="Buscar o escribir lo que has comido"
            value={query}
            onIonInput={(e) => {
              setQuery(String(e.detail.value ?? ''));
              setSelected(null);
            }}
          />
        </div>

        {selected ? (
          <>
            <div className="core-card" style={{ marginTop: 16 }}>
              <div className="ritmo-entry" style={{ padding: 0 }}>
                <div className="ritmo-entry__body">
                  <div className="ritmo-entry__name">{selected.name}</div>
                  <div className="ritmo-entry__meta">
                    {selected.kcalPer100} kcal / 100{' '}
                    {selected.isLiquid ? 'ml' : 'g'}
                  </div>
                </div>
                <IonButton fill="clear" size="small" onClick={() => setSelected(null)}>
                  Cambiar
                </IonButton>
              </div>
            </div>

            <p className="core-section-label" style={{ marginTop: 24 }}>
              Cantidad
            </p>
            <div className="core-group" style={{ padding: 8 }}>
              <IonInput
                className="core-field"
                type="number"
                inputMode="decimal"
                label={selected.isLiquid ? 'ml' : 'g'}
                labelPlacement="end"
                value={quantity}
                onIonInput={(e) => setQuantity(String(e.detail.value ?? ''))}
              />
            </div>
            {preview !== null ? (
              <p className="core-subtitle" style={{ marginTop: 10 }}>
                ≈ {formatKcal(preview)} kcal
              </p>
            ) : null}
          </>
        ) : searching ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 32 }}>
            <IonSpinner name="crescent" />
          </div>
        ) : results.length > 0 ? (
          <div className="core-group" style={{ marginTop: 16 }}>
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                className="ritmo-entry"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setSelected(food);
                  const byDefault = food.servings.find((s) => s.isDefault);
                  setQuantity(String(byDefault?.grams ?? 100));
                }}
              >
                <div className="ritmo-entry__body">
                  <div className="ritmo-entry__name">
                    {food.brand ? `${food.name} · ${food.brand}` : food.name}
                  </div>
                  <div className="ritmo-entry__meta">
                    {food.kcalPer100} kcal / 100 {food.isLiquid ? 'ml' : 'g'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : query.trim().length > 1 ? (
          <>
            {/* Nada en el catálogo: en vez de dejar al usuario en un callejón
                sin salida, el propio texto que escribió sirve de registro
                rápido con solo poner las kcal. */}
            <EmptyState
              title="Sin resultados"
              description="Regístralo como comida rápida indicando las kcal."
            />
            <div className="core-group" style={{ padding: 8 }}>
              <IonInput
                className="core-field"
                type="number"
                inputMode="numeric"
                label="kcal"
                labelPlacement="end"
                placeholder="700"
                value={quickKcal}
                onIonInput={(e) => setQuickKcal(String(e.detail.value ?? ''))}
              />
            </div>
          </>
        ) : null}

        <IonButton
          expand="block"
          style={{ marginTop: 28 }}
          disabled={saving || (!canSaveCatalog && !canSaveQuick)}
          onClick={() => void save()}
        >
          Añadir a {mealLabel(mealType).toLowerCase()}
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
