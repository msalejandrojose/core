import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonContent, IonPage, useIonViewWillEnter } from '@ionic/react';
import { toast } from '@/lib/toast';
import { brioApi, isApiError, type Food } from '../api';
import { formatNumber } from '../format';
import { FoodIcon } from '../ui/food-icons';
import { iconForFood } from '../ui/food-icons.data';
import { SearchField, SheetBar, Stepper } from '../ui/kit';
import { MEAL_LABEL, menuApi, type Meal } from './menu.api';
import { dayFull, dayNumber } from './plan-labels';
import { isPlanMeal, planMealKcal, portionGrams, stepServings, type PlanPortion } from './plan-meal';
import './plan.css';
import '../performance/performance.css';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const portionGramsOk = (f: Food, p: PlanPortion) => (p.servingId ? p.quantity >= 0.25 : p.quantity >= 1) && portionGrams(f, p) > 0;
const SEARCH_DEBOUNCE_MS = 250;

/** Ración de partida al elegir un alimento: su ración por defecto, o 100 g si no tiene. */
function firstPortion(food: Food): PlanPortion {
  const s = food.servings.find((x) => x.isDefault) ?? food.servings[0];
  return s ? { servingId: s.id, quantity: 1 } : { servingId: null, quantity: 100 };
}

/**
 * Poner algo en una comida del menú de un día: una receta tuya, cualquier
 * alimento del catálogo o, si no está, un plato a mano con sus kcal. Lo que
 * pongas sustituye al plato sugerido de esa comida.
 */
export default function PlanMealPage() {
  const history = useHistory();
  const params = useParams<{ day: string; meal: string }>();
  const day = DAY_RE.test(params.day) ? params.day : null;
  const meal = isPlanMeal(params.meal?.toUpperCase()) ? (params.meal.toUpperCase() as Meal) : null;

  const [recipes, setRecipes] = useState<Food[] | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[] | null>(null);
  const [picked, setPicked] = useState<Food | null>(null);
  const [portion, setPortion] = useState<PlanPortion>({ servingId: null, quantity: 100 });
  const [manualName, setManualName] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [saving, setSaving] = useState(false);

  useIonViewWillEnter(() => {
    brioApi
      .recipes()
      .then(setRecipes)
      .catch(() => setRecipes([]));
  });

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const timer = window.setTimeout(() => {
      brioApi
        .searchFoods(q)
        .then(setResults)
        .catch(() => setResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/comida'));

  if (!day || !meal) {
    return (
      <IonPage>
        <IonContent>
          <div className="rk-sheet plan-sheet">
            <SheetBar title="Menú" onCancel={back} cancelLabel="Cerrar" />
            <p className="rk-note">Ese día o esa comida no existen.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const full = dayFull(day);
  const title = `${MEAL_LABEL[meal]} · ${full.slice(0, 3)} ${dayNumber(day)}`;

  function pick(f: Food) {
    setPicked(f);
    setPortion(firstPortion(f));
  }

  async function save(body: Parameters<typeof menuApi.addItem>[2], ok: string) {
    if (!day || !meal) return;
    setSaving(true);
    try {
      await menuApi.addItem(day, meal, body);
      toast.success(ok, `${MEAL_LABEL[meal]} del ${full} ${dayNumber(day)}`);
      back();
    } catch (e) {
      toast.error('No se pudo añadir', isApiError(e) ? e.message : undefined);
      setSaving(false);
    }
  }

  const addPicked = () =>
    picked &&
    save(
      { foodId: picked.id, ...(portion.servingId ? { servingId: portion.servingId } : {}), quantity: portion.quantity },
      `${picked.name} en el menú`,
    );

  const kcalNum = Number(manualKcal.replace(',', '.'));
  const manualOk = manualName.trim().length >= 2 && manualKcal.trim() !== '' && Number.isFinite(kcalNum) && kcalNum >= 0 && kcalNum <= 5000;
  const addManual = () =>
    manualOk && save({ customName: manualName.trim(), kcal: Math.round(kcalNum) }, `${manualName.trim()} en el menú`);

  const list = results ?? recipes ?? [];
  const serving = picked?.servings.find((s) => s.id === portion.servingId) ?? null;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet plan-sheet">
          <span className="rk-grab" aria-hidden="true" />
          <SheetBar title={title} onCancel={back} action={{ label: 'Añadir', onClick: () => void addPicked(), disabled: !picked || saving || !portionGramsOk(picked, portion) }} />

          {picked ? (
            <section className="planmeal__picked" aria-label="Cantidad">
              <div className="planmeal__picked-head">
                <FoodIcon icon={iconForFood(picked.name)} size={44} shape="square" />
                <span className="rk-row__main">
                  <span className="rk-row__title">{picked.name}</span>
                  <span className="rk-row__sub">{formatNumber(planMealKcal(picked, portion))} kcal</span>
                </span>
                <button type="button" className="rk-textbtn" onClick={() => setPicked(null)}>
                  Cambiar
                </button>
              </div>
              <div className="plan__chips" role="group" aria-label="Medida">
                {picked.servings.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={portion.servingId === s.id}
                    className={`plan__chip${portion.servingId === s.id ? ' is-on' : ''}`}
                    onClick={() => setPortion({ servingId: s.id, quantity: 1 })}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={portion.servingId === null}
                  className={`plan__chip${portion.servingId === null ? ' is-on' : ''}`}
                  onClick={() => setPortion({ servingId: null, quantity: serving ? Math.round(serving.grams * portion.quantity) : 100 })}
                >
                  En gramos
                </button>
              </div>
              {serving ? (
                <div className="rk-row perf__field">
                  <span className="rk-row__main">
                    <span className="rk-row__title">Raciones</span>
                    <span className="rk-row__sub">{formatNumber(Math.round(serving.grams * portion.quantity))} g</span>
                  </span>
                  <Stepper
                    value={formatNumber(portion.quantity, Number.isInteger(portion.quantity) ? 0 : 1)}
                    onMinus={() => setPortion((p) => ({ ...p, quantity: stepServings(p.quantity, -1) }))}
                    onPlus={() => setPortion((p) => ({ ...p, quantity: stepServings(p.quantity, 1) }))}
                    minusLabel="Media ración menos"
                    plusLabel="Media ración más"
                  />
                </div>
              ) : (
                <label className="rk-row perf__field">
                  <span className="rk-row__main rk-row__title">Cantidad ({picked.isLiquid ? 'ml' : 'g'})</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(portion.quantity)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(',', '.'));
                      setPortion({ servingId: null, quantity: Number.isFinite(n) ? Math.min(3000, Math.max(0, Math.round(n))) : 0 });
                    }}
                  />
                </label>
              )}
              <button type="button" className="plan__btn plan__btn--primary" disabled={saving || !portionGramsOk(picked, portion)} onClick={() => void addPicked()}>
                Añadir al menú
              </button>
            </section>
          ) : (
            <>
              <SearchField label="Buscar alimento o receta" placeholder="Buscar alimento o receta" value={query} onChange={setQuery} autoFocus />
              <div className="rk-sechead">
                <h2>{results ? 'Resultados' : 'Tus recetas'}</h2>
              </div>
              {list.length ? (
                <ul className="rk-list" aria-label={results ? 'Resultados' : 'Tus recetas'}>
                  {list.map((f) => {
                    const s = f.servings.find((x) => x.isDefault) ?? f.servings[0];
                    const sub = s ? `${s.label} · ${formatNumber(Math.round((f.kcalPer100 * s.grams) / 100))} kcal` : `${formatNumber(f.kcalPer100)} kcal / 100 ${f.isLiquid ? 'ml' : 'g'}`;
                    return (
                      <li key={f.id}>
                        <button type="button" className="rk-row planmeal__food" onClick={() => pick(f)}>
                          <FoodIcon icon={iconForFood(f.name)} size={40} shape="square" />
                          <span className="rk-row__main">
                            <span className="rk-row__title">{f.brand ? `${f.name} (${f.brand})` : f.name}</span>
                            <span className="rk-row__sub">{sub}</span>
                          </span>
                          <span className="planmeal__add" aria-hidden="true">
                            +
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rk-note">
                  {results ? 'No hay nada con ese nombre. Puedes ponerlo a mano abajo.' : recipes === null ? 'Cargando…' : 'Aún no tienes recetas. Busca cualquier alimento arriba.'}
                </p>
              )}

              <div className="rk-sechead">
                <h2>A mano</h2>
              </div>
              <div className="rk-list">
                <label className="rk-row perf__field">
                  <span className="rk-row__main rk-row__title">Plato</span>
                  <input type="text" className="perf__text" value={manualName} maxLength={200} placeholder="Menú del día" onChange={(e) => setManualName(e.target.value)} />
                </label>
                <label className="rk-row perf__field">
                  <span className="rk-row__main rk-row__title">Kcal</span>
                  <input type="text" inputMode="numeric" value={manualKcal} placeholder="—" onChange={(e) => setManualKcal(e.target.value)} />
                </label>
              </div>
              <button type="button" className="plan__btn" disabled={!manualOk || saving} onClick={() => void addManual()}>
                Añadir a mano
              </button>
            </>
          )}
          <p className="rk-note">Lo que pongas sustituye al plato sugerido de esa comida. No se apunta en tu diario hasta que lo marques como comido.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
