import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { ritmoApi, type Food, type HabitItem, type MealType } from '../api';
import { MEAL_ORDER, formatKcal, joinNames, mealLabel } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { useHabitsStore } from '../habits.store';
import { deleteEntries, logItems, type RelogItem } from '../relog';
import { tapSuccess } from '../haptics';
import { FoodIcon } from '../ui/food-icons';
import { Icon, SearchField, Segmented, SectionHeader, SheetBar } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import './sheets.css';

const SEARCH_DEBOUNCE_MS = 300;

const MEAL_ARTICLE: Record<MealType, string> = {
  BREAKFAST: 'el desayuno',
  LUNCH: 'la comida',
  SNACK: 'la merienda',
  DINNER: 'la cena',
};
const MEAL_HINT: Record<MealType, string> = {
  BREAKFAST: 'Lo que sueles desayunar',
  LUNCH: 'Lo que sueles comer a mediodía',
  SNACK: 'Lo que sueles merendar',
  DINNER: 'Lo que sueles cenar',
};
const MEAL_LOGGED: Record<MealType, string> = {
  BREAKFAST: 'Desayuno registrado',
  LUNCH: 'Comida registrada',
  SNACK: 'Merienda registrada',
  DINNER: 'Cena registrada',
};

/** Alimento elegido para añadir, con su cantidad y kcal de vista previa. */
interface Picked extends RelogItem {
  key: string;
}

function fromHabit(item: HabitItem): Picked {
  return { ...item };
}

/** Del catálogo con su ración por defecto (o 100 g). Kcal solo informativas. */
function fromFood(food: Food): Picked {
  const grams = food.servings.find((s) => s.isDefault)?.grams ?? food.servings[0]?.grams ?? 100;
  const f = grams / 100;
  return {
    key: food.id,
    foodId: food.id,
    name: food.name,
    quantityG: grams,
    kcal: food.kcalPer100 * f,
    proteinG: food.proteinPer100G * f,
    carbsG: food.carbsPer100G * f,
    fatG: food.fatPer100G * f,
  };
}

function portion(grams: number, isLiquid = false): string {
  return `${formatKcal(grams)} ${isLiquid ? 'ml' : 'g'}`;
}

/** "Hoy", "Ayer" o el día de la semana. */
function whenLabel(day: string, today: string): string {
  if (day === today) return 'Hoy';
  const t = new Date(`${today}T12:00:00Z`);
  const d = new Date(`${day}T12:00:00Z`);
  const diff = Math.round((t.getTime() - d.getTime()) / 86_400_000);
  if (diff === 1) return 'Ayer';
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' }).format(d);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

interface AddFoodSheetProps {
  isOpen: boolean;
  initialMealType: MealType;
  onClose: () => void;
}

/**
 * Añadir alimento (lienzo "Añadir alimento"). Pensado para no buscar: lo de
 * siempre de esa comida, tus frecuentes con su dibujo y lo reciente, todo a un
 * toque. Se pueden marcar varios y añadirlos juntos; la barra de abajo dice
 * cuántas kcal suman y cuántas quedarán.
 */
export function AddFoodSheet({ isOpen, initialMealType, onClose }: AddFoodSheetProps) {
  const day = useRitmoStore((s) => s.day);
  const summary = useRitmoStore((s) => s.summary);
  const refreshDay = useRitmoStore((s) => s.refreshDay);
  const habitsByMeal = useHabitsStore((s) => s.byMeal);
  const loadHabits = useHabitsStore((s) => s.load);
  const invalidateHabits = useHabitsStore((s) => s.invalidate);

  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[] | null>(null);
  const [quickKcal, setQuickKcal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMealType(initialMealType);
    setPicked({});
    setQuery('');
    setResults(null);
    setQuickKcal('');
  }, [isOpen, initialMealType]);

  useEffect(() => {
    if (isOpen) void loadHabits(mealType);
  }, [isOpen, mealType, loadHabits]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const timer = window.setTimeout(() => {
      ritmoApi
        .searchFoods(q)
        .then(setResults)
        .catch(() => setResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const habits = habitsByMeal[mealType];
  const items = Object.values(picked);
  const total = items.reduce((s, i) => s + i.kcal, 0);
  const remaining = summary?.totals.kcalRemaining ?? null;

  const toggle = (item: Picked) =>
    setPicked((p) => {
      const next = { ...p };
      if (next[item.key]) delete next[item.key];
      else next[item.key] = item;
      return next;
    });

  const toggleCombo = (combo: HabitItem[]) =>
    setPicked((p) => {
      const next = { ...p };
      const all = combo.every((i) => next[i.key]);
      for (const i of combo) {
        if (all) delete next[i.key];
        else next[i.key] = fromHabit(i);
      }
      return next;
    });

  const quickKcalNum = Number(quickKcal.replace(',', '.'));
  const canQuick = query.trim().length > 1 && Number.isFinite(quickKcalNum) && quickKcalNum > 0;

  function addQuick() {
    const name = query.trim();
    toggle({
      key: `text:${name.toLowerCase()}`,
      foodId: null,
      name,
      quantityG: 1,
      kcal: quickKcalNum,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    setQuery('');
    setQuickKcal('');
  }

  async function save() {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const created = await logItems(items, mealType, day);
      await refreshDay();
      invalidateHabits();
      void tapSuccess();
      const kcal = created.reduce((s, e) => s + e.kcal, 0);
      snackbar.undo(`${MEAL_LOGGED[mealType]} · ${formatKcal(kcal)} kcal`, async () => {
        await deleteEntries(created.map((c) => c.id));
        await refreshDay();
        invalidateHabits();
      });
      onClose();
    } catch {
      toast.error('No se pudo añadir');
    } finally {
      setSaving(false);
    }
  }

  const today = day;
  const searching = results !== null;

  const countLabel = items.length
    ? items.length === 1
      ? '1 alimento'
      : `${items.length} alimentos`
    : 'Toca un dibujo para añadirlo';
  const kcalLabel = items.length
    ? `${formatKcal(total)} kcal${remaining !== null ? ` · quedarán ${formatKcal(remaining - total)}` : ''}`
    : remaining !== null
      ? `Te quedan ${formatKcal(remaining)} kcal hoy`
      : '';

  const combos = useMemo(() => habits?.combos ?? [], [habits]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="rk-modal-full">
      <IonContent>
        <div className="rk-sheet addfood">
          <span className="rk-grab" aria-hidden="true" />
          <SheetBar
            title={`Añadir a ${mealLabel(mealType).toLowerCase()}`}
            onCancel={onClose}
            action={{ label: 'Listo', onClick: () => void save(), disabled: saving || items.length === 0 }}
          />

          <div className="rk-section">
            <Segmented
              label="Comida del día"
              small
              value={mealType}
              onChange={setMealType}
              options={MEAL_ORDER.map((t) => ({ value: t, label: mealLabel(t) }))}
            />
            <span className="addfood__hint">{MEAL_HINT[mealType]}</span>
          </div>

          <SearchField
            label="Buscar alimento"
            placeholder="Buscar o escribir lo que has comido"
            value={query}
            onChange={setQuery}
          />

          {searching ? (
            <section className="rk-section" aria-label="Resultados">
              <ul className="rk-list addfood__list">
                {results.map((food) => {
                  const item = fromFood(food);
                  const on = !!picked[item.key];
                  return (
                    <li key={food.id} className="addfood__item">
                      <FoodIcon name={food.name} size={38} />
                      <div className="addfood__cell">
                        <div className="rk-row__main">
                          <span className="rk-row__title">{food.name}</span>
                          <span className="rk-row__sub">
                            {portion(item.quantityG, food.isLiquid)} · {formatKcal(food.kcalPer100)} kcal/100
                          </span>
                        </div>
                        <span className="rk-row__value">{formatKcal(item.kcal)} kcal</span>
                        <AddToggle on={on} name={food.name} onClick={() => toggle(item)} />
                      </div>
                    </li>
                  );
                })}
                <li className="addfood__item addfood__quick">
                  <FoodIcon icon="plate" size={38} />
                  <div className="addfood__cell">
                    <div className="rk-row__main">
                      <span className="rk-row__title">«{query.trim()}»</span>
                      <span className="rk-row__sub">Sin buscar: escribe sus kcal</span>
                    </div>
                    <label className="addfood__kcal">
                      <span className="rk-visually-hidden">Kilocalorías</span>
                      <input
                        inputMode="numeric"
                        placeholder="kcal"
                        value={quickKcal}
                        onChange={(e) => setQuickKcal(e.target.value)}
                      />
                    </label>
                    <AddToggle on={false} name={query.trim()} disabled={!canQuick} onClick={addQuick} />
                  </div>
                </li>
              </ul>
            </section>
          ) : (
            <>
              {combos.length > 0 ? (
                <section className="rk-section" aria-labelledby="siempre">
                  <SectionHeader id="siempre">Lo de siempre en {MEAL_ARTICLE[mealType]}</SectionHeader>
                  <div className="addfood__combos">
                    {combos.map((combo) => {
                      const added = combo.items.every((i) => picked[i.key]);
                      const name = joinNames(combo.items.map((i) => i.name));
                      return (
                        <div key={combo.items.map((i) => i.key).join('|')} className="addfood__combo">
                          <div className="addfood__combo-icons">
                            {combo.items.slice(0, 3).map((i, idx) => (
                              <FoodIcon
                                key={i.key}
                                name={i.name}
                                size={40}
                                style={{ border: '2px solid #FFFFFF', marginLeft: idx ? -10 : 0 }}
                              />
                            ))}
                          </div>
                          <span className="addfood__combo-name">{name}</span>
                          <span className="addfood__combo-meta">
                            {combo.count} veces · {formatKcal(combo.kcal)} kcal
                          </span>
                          <button
                            type="button"
                            className={`addfood__combo-add${added ? ' is-on' : ''}`}
                            aria-label={`${added ? 'Quitar' : 'Añadir'} ${name}`}
                            onClick={() => toggleCombo(combo.items)}
                          >
                            <Icon d={added ? 'M6 12.5l4 4 8-9' : PATHS.plus} size={18} stroke={2.6} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {habits && habits.frequent.length > 0 ? (
                <section className="rk-section" aria-labelledby="frec">
                  <SectionHeader id="frec">Tus frecuentes</SectionHeader>
                  <div className="addfood__freq">
                    {habits.frequent.map((f) => {
                      const on = !!picked[f.key];
                      return (
                        <button
                          key={f.key}
                          type="button"
                          className="addfood__freq-item"
                          aria-pressed={on}
                          aria-label={`${f.name}, ${portion(f.quantityG)}, ${formatKcal(f.kcal)} kcal`}
                          onClick={() => toggle(fromHabit(f))}
                        >
                          <span className="addfood__freq-bubble">
                            <FoodIcon
                              name={f.name}
                              size={58}
                              style={on ? { boxShadow: '0 0 0 2.5px var(--ritmo-tint)' } : undefined}
                            />
                            {on ? (
                              <span className="addfood__freq-check" aria-hidden="true">
                                <Icon d="M6 12.5l4 4 8-9" size={12} stroke={3} />
                              </span>
                            ) : null}
                          </span>
                          <span className="addfood__freq-name">{f.name.split(' ')[0]}</span>
                          <span className="addfood__freq-kcal">{formatKcal(f.kcal)} kcal</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {habits && habits.recent.length > 0 ? (
                <section className="rk-section" aria-labelledby="rec">
                  <SectionHeader id="rec">Recientes</SectionHeader>
                  <ul className="rk-list addfood__list">
                    {habits.recent.map((r) => {
                      const on = !!picked[r.key];
                      return (
                        <li key={r.key} className="addfood__item">
                          <FoodIcon name={r.name} size={38} />
                          <div className="addfood__cell">
                            <div className="rk-row__main">
                              <span className="rk-row__title">{r.name}</span>
                              <span className="rk-row__sub">
                                {whenLabel(r.lastOn, today)} · {portion(r.quantityG)}
                              </span>
                            </div>
                            <span className="rk-row__value">{formatKcal(r.kcal)} kcal</span>
                            <AddToggle on={on} name={r.name} onClick={() => toggle(fromHabit(r))} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {habits && habits.frequent.length === 0 ? (
                <p className="rk-note">
                  Aún no hay nada guardado para {MEAL_ARTICLE[mealType]}. Busca lo que has comido y la próxima vez
                  aparecerá aquí.
                </p>
              ) : null}
            </>
          )}
        </div>
      </IonContent>

      <div className="addfood__bar">
        <div className="rk-row__main">
          <span className="addfood__bar-count">{countLabel}</span>
          <span className="rk-row__sub">{kcalLabel}</span>
        </div>
        <button type="button" className="rk-btn" disabled={saving || items.length === 0} onClick={() => void save()}>
          Añadir
        </button>
      </div>
    </IonModal>
  );
}

function AddToggle({
  on,
  name,
  disabled,
  onClick,
}: {
  on: boolean;
  name: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rk-iconbtn"
      aria-pressed={on}
      aria-label={`${on ? 'Quitar' : 'Añadir'} ${name}`}
      disabled={disabled}
      onClick={onClick}
    >
      {on ? (
        <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="currentColor" />
          <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <Icon d={PATHS.plusCircle} size={26} stroke={1.8} />
      )}
    </button>
  );
}
