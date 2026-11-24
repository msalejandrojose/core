import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { SWIPE_TO_CLOSE } from './swipe';
import { brioApi, type Food, type FoodSection, type HabitItem, type MealType } from '../api';
import { MEAL_ORDER, formatKcal, joinNames, mealLabel, todayIn } from '../format';
import { useBrioStore } from '../brio.store';
import { useHabitsStore } from '../habits.store';
import { deleteEntries, logItems, type RelogItem } from '../relog';
import { tapSuccess } from '../haptics';
import { FoodIcon } from '../ui/food-icons';
import { FOOD_ICONS, type FoodIconKey } from '../ui/food-icons.data';
import { CreateFoodSheet } from './CreateFoodSheet';
import { scanFoodBarcode } from '../food/barcode';
import { clampFactor, factorLabel, nextQuickFactor, scaleItem, stepFactor } from '../food/portion';
import { Icon, SearchField, Segmented, SectionHeader, SheetBar } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import { DayPicker } from './DayPicker';
import { FoodTray } from './FoodTray';
import { SandwichBuilderSheet } from '../sandwich/SandwichBuilderSheet';
import { dayChipLabel } from './day-pick';
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

/** Clave de dibujo que manda la API; si la app no la conoce, un plato. */
function sectionIcon(icon: string): FoodIconKey {
  return icon in FOOD_ICONS ? (icon as FoodIconKey) : 'plate';
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
  const day = useBrioStore((s) => s.day);
  const timezone = useBrioStore((s) => s.profile?.timezone ?? 'Europe/Madrid');
  const summary = useBrioStore((s) => s.summary);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const habitsByMeal = useHabitsStore((s) => s.byMeal);
  const loadHabits = useHabitsStore((s) => s.load);
  const invalidateHabits = useHabitsStore((s) => s.invalidate);

  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  /** Multiplicador de ración de cada alimento elegido (×1 si no se ha tocado). */
  const [factors, setFactors] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[] | null>(null);
  const [quickKcal, setQuickKcal] = useState('');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  /** Código escaneado que no conocíamos: se pasa al crear el alimento. */
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [typical, setTypical] = useState<Partial<Record<MealType, FoodSection[]>>>({});
  const [section, setSection] = useState<string | null>(null);
  /** Bandeja abierta: la lista de lo que vas a añadir, para revisarla (TASK-432). */
  const [trayOpen, setTrayOpen] = useState(false);
  /** Creador de bocatas y tostadas abierto (TASK-433). */
  const [building, setBuilding] = useState(false);
  const realToday = todayIn(timezone);
  /** Día en que se apunta: el que estás viendo, o el que elijas. */
  const [on, setOn] = useState(day);

  useEffect(() => {
    if (!isOpen) return;
    setMealType(initialMealType);
    setPicked({});
    setFactors({});
    setQuery('');
    setResults(null);
    setQuickKcal('');
    setSection(null);
    setTrayOpen(false);
  }, [isOpen, initialMealType]);

  useEffect(() => {
    if (isOpen) setOn(day > realToday ? realToday : day);
  }, [isOpen, day, realToday]);

  useEffect(() => setSection(null), [mealType]);

  useEffect(() => {
    if (isOpen) void loadHabits(mealType);
  }, [isOpen, mealType, loadHabits]);

  // Lo típico de cada momento del día (no cambia: se pide una vez por momento).
  useEffect(() => {
    if (!isOpen || typical[mealType]) return;
    brioApi
      .typicalFoods(mealType)
      .then((foods) => setTypical((t) => ({ ...t, [mealType]: foods })))
      .catch(() => undefined);
  }, [isOpen, mealType, typical]);

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

  const habits = habitsByMeal[mealType];
  const items = Object.values(picked).map((i) => scaleItem(i, factors[i.key] ?? 1));
  const total = items.reduce((s, i) => s + i.kcal, 0);
  // Sin nada elegido no hay bandeja que enseñar.
  useEffect(() => {
    if (items.length === 0) setTrayOpen(false);
  }, [items.length]);
  const setFactor = (key: string, f: number) => setFactors((x) => ({ ...x, [key]: clampFactor(f) }));
  // Lo que queda solo se sabe del día que está cargado.
  const remaining = on === day ? (summary?.totals.kcalRemaining ?? null) : null;
  /** Kcal de una fila: con su ración multiplicada si ya está elegida. */
  const kcalOf = (it: { key: string; kcal: number } & Picked) =>
    picked[it.key] ? scaleItem(it, factors[it.key] ?? 1).kcal : it.kcal;
  /** Ración a la derecha del ✓: − / número (toca para 1 → 1½ → 2 → ½) / +. */
  const portionFor = (it: { key: string; name: string }) => (
    <PortionStepper
      name={it.name}
      factor={factors[it.key] ?? 1}
      onChange={(f) => setFactor(it.key, f)}
    />
  );

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

  /** Escanea un envase: si lo conocemos (o está en Open Food Facts) se añade; si no, a crearlo. */
  async function scan() {
    const code = await scanFoodBarcode();
    if (!code) return;
    setScanning(true);
    try {
      const food = await brioApi.foodByBarcode(code);
      if (food) {
        const item = fromFood(food);
        setResults([food]);
        setPicked((p) => ({ ...p, [item.key]: item }));
        void tapSuccess();
        toast.success(`${food.name} añadido`, 'Ajusta la cantidad si no es la ración entera.');
      } else {
        setUnknownBarcode(code);
        setCreating(true);
        toast.info('No conocemos ese producto', 'Apunta lo que pone la etiqueta y quedará guardado para la próxima.');
      }
    } catch {
      toast.error('No se pudo buscar el código');
    } finally {
      setScanning(false);
    }
  }

  async function save() {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const created = await logItems(items, mealType, on);
      await refreshDay();
      invalidateHabits();
      void tapSuccess();
      const kcal = created.reduce((s, e) => s + e.kcal, 0);
      snackbar.undo(
        `${MEAL_LOGGED[mealType]}${on === realToday ? '' : ` · ${dayChipLabel(on, realToday).toLowerCase()}`} · ${formatKcal(kcal)} kcal`, async () => {
        await deleteEntries(created.map((c) => c.id));
        await refreshDay();
        invalidateHabits();
      }, { tone: 'food', icon: 'food', undone: 'Comida quitada' });
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
    : 'Toca un dibujo para elegirlo';
  const kcalLabel = items.length
    ? `${formatKcal(total)} kcal${remaining !== null ? ` · quedarán ${formatKcal(remaining - total)}` : ''}`
    : remaining !== null
      ? `Te quedan ${formatKcal(remaining)} kcal${on === realToday ? ' hoy' : ''}`
      : '';

  const combos = useMemo(() => habits?.combos ?? [], [habits]);
  const sections = typical[mealType] ?? [];
  const openSection = sections.find((sec) => sec.code === section) ?? null;
  // Lo de aquí arriba; las cocinas del mundo, en su propio bloque (TASK-431).
  const homeSections = sections.filter((sec) => sec.group !== 'world');
  const worldSections = sections.filter((sec) => sec.group === 'world');
  const sectionButton = (sec: FoodSection) => {
    const count = sec.foods.filter((f) => picked[f.id]).length;
    return (
      <button
        key={sec.code}
        type="button"
        className="addfood__sec"
        aria-label={`${sec.label}${count ? `, ${count} elegidos` : ''}`}
        onClick={() => setSection(sec.code)}
      >
        <span className="addfood__freq-bubble">
          <FoodIcon icon={sectionIcon(sec.icon)} size={56} />
          {count ? <span className="addfood__sec-count">{count}</span> : null}
        </span>
        <span className="addfood__sec-label">{sec.label}</span>
      </button>
    );
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="rk-modal-full" {...SWIPE_TO_CLOSE}>
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
            <DayPicker value={on} today={realToday} onChange={setOn} label="Día de la comida" />
          </div>

          <div className="rk-search-row">
            <SearchField
              label="Buscar alimento"
              placeholder="Buscar o escribir lo que has comido"
              value={query}
              onChange={setQuery}
            />
            <button
              type="button"
              className="rk-iconbtn addfood__scan"
              aria-label="Escanear código de barras"
              disabled={scanning}
              onClick={() => void scan()}
            >
              <Icon d={PATHS.barcode} size={24} />
            </button>
          </div>

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
                            {on
                              ? `${formatKcal(kcalOf(item))} kcal · ${formatKcal(scaleItem(item, factors[item.key] ?? 1).quantityG)} ${food.isLiquid ? 'ml' : 'g'}`
                              : `${portion(item.quantityG, food.isLiquid)} · ${formatKcal(food.kcalPer100)} kcal/100`}
                          </span>
                        </div>
                        {on ? null : <span className="rk-row__value">{formatKcal(kcalOf(item))} kcal</span>}
                        <AddToggle on={on} name={food.name} onClick={() => toggle(item)} />
                        {on ? portionFor(item) : null}
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
                <li className="addfood__item">
                  <button type="button" className="addfood__create" onClick={() => setCreating(true)}>
                    <Icon d={PATHS.plusCircle} size={22} stroke={1.8} />
                    <span className="rk-row__main">
                      <span className="rk-row__title">Crear «{query.trim()}» como alimento</span>
                      <span className="rk-row__sub">Con sus valores de la etiqueta, para usarlo siempre</span>
                    </span>
                  </button>
                </li>
              </ul>
            </section>
          ) : openSection ? (
            <section className="rk-section" aria-labelledby="seccion">
              <div className="addfood__sec-head">
                <button type="button" className="rk-textbtn addfood__sec-back" onClick={() => setSection(null)}>
                  <Icon d={PATHS.back} size={16} stroke={2.4} />
                  Todo
                </button>
                <FoodIcon icon={sectionIcon(openSection.icon)} size={30} />
                <span id="seccion" className="addfood__sec-title">
                  {openSection.label}
                </span>
              </div>
              <ul className="rk-list addfood__list">
                {openSection.foods.map((food) => {
                  const item = fromFood(food);
                  const on = !!picked[item.key];
                  const serving = food.servings.find((sv) => sv.isDefault) ?? food.servings[0];
                  return (
                    <li key={food.id} className="addfood__item">
                      <FoodIcon name={food.name} size={38} />
                      <div className="addfood__cell">
                        <div className="rk-row__main">
                          <span className="rk-row__title">{food.name}</span>
                          <span className="rk-row__sub">
                            {serving ? serving.label : portion(item.quantityG, food.isLiquid)}
                            {on ? ` · ${formatKcal(kcalOf(item))} kcal` : ''}
                          </span>
                        </div>
                        {on ? null : <span className="rk-row__value">{formatKcal(kcalOf(item))} kcal</span>}
                        <AddToggle on={on} name={food.name} onClick={() => toggle(item)} />
                        {on ? portionFor(item) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <>
              <button type="button" className="rk-list rk-row addfood__builder" onClick={() => setBuilding(true)}>
                <FoodIcon icon="sandwich" size={44} />
                <span className="rk-row__main">
                  <span className="rk-row__title">Monta tu bocata o tostada</span>
                  <span className="rk-row__sub">Elige el pan y lo que lleva; calcula las kcal</span>
                </span>
                <Icon d={PATHS.forward} size={16} stroke={2.4} />
              </button>

              {homeSections.length > 0 ? (
                <section className="rk-section" aria-labelledby="secciones">
                  <SectionHeader id="secciones">¿Qué has tomado?</SectionHeader>
                  <div className="addfood__secs">{homeSections.map(sectionButton)}</div>
                </section>
              ) : null}

              {worldSections.length > 0 ? (
                <section className="rk-section" aria-labelledby="mundo">
                  <SectionHeader id="mundo">Cocinas del mundo</SectionHeader>
                  <div className="addfood__secs">{worldSections.map(sectionButton)}</div>
                </section>
              ) : null}

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
                        <div key={f.key} className="addfood__freq-cell">
                        <button
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
                              style={on ? { boxShadow: '0 0 0 2.5px var(--brio-tint)' } : undefined}
                            />
                            {on ? (
                              <span className="addfood__freq-check" aria-hidden="true">
                                <Icon d="M6 12.5l4 4 8-9" size={12} stroke={3} />
                              </span>
                            ) : null}
                          </span>
                          <span className="addfood__freq-name">{f.name.split(' ')[0]}</span>
                          <span className="addfood__freq-kcal">{formatKcal(kcalOf(fromHabit(f)))} kcal</span>
                        </button>
                        {on ? portionFor(f) : null}
                        </div>
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
                                {on ? ` · ${formatKcal(kcalOf(r))} kcal` : ''}
                              </span>
                            </div>
                            {on ? null : <span className="rk-row__value">{formatKcal(kcalOf(r))} kcal</span>}
                            <AddToggle on={on} name={r.name} onClick={() => toggle(fromHabit(r))} />
                            {on ? portionFor(r) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {habits && habits.frequent.length === 0 ? (
                <p className="rk-note">
                  Lo que apuntes para {MEAL_ARTICLE[mealType]} irá apareciendo arriba, en tus frecuentes.
                </p>
              ) : null}
            </>
          )}
        </div>
      </IonContent>

      {trayOpen ? (
        <>
          <div className="addfood__tray-scrim" onClick={() => setTrayOpen(false)} />
          <FoodTray
            title={`Vas a añadir a ${MEAL_ARTICLE[mealType]}`}
            items={items}
            portionFor={portionFor}
            onRemove={(key) => toggle(picked[key])}
            onClear={() => {
              setPicked({});
              setFactors({});
            }}
          />
        </>
      ) : null}

      <div className="addfood__bar">
        <button
          type="button"
          className="addfood__bar-summary"
          aria-expanded={trayOpen}
          aria-label={items.length ? `${countLabel}, ${kcalLabel}. ${trayOpen ? 'Ocultar' : 'Ver'} la lista` : countLabel}
          disabled={items.length === 0}
          onClick={() => setTrayOpen((v) => !v)}
        >
          {items.length ? (
            <span className="addfood__bar-icons" aria-hidden="true">
              {items.slice(0, 3).map((it, idx) => (
                <FoodIcon key={it.key} name={it.name} size={30} style={{ marginLeft: idx ? -10 : 0, border: '2px solid #FFFFFF' }} />
              ))}
            </span>
          ) : null}
          <span className="rk-row__main">
            <span className="addfood__bar-count">{countLabel}</span>
            <span className="rk-row__sub">{kcalLabel}</span>
          </span>
          {items.length ? (
            <span className={`addfood__bar-chevron${trayOpen ? ' is-open' : ''}`} aria-hidden="true">
              <Icon d="M6 15l6-6 6 6" size={16} stroke={2.4} />
            </span>
          ) : null}
        </button>
        <button type="button" className="rk-btn" disabled={saving || items.length === 0} onClick={() => void save()}>
          Añadir
        </button>
      </div>
      <SandwichBuilderSheet
        isOpen={building}
        onClose={() => setBuilding(false)}
        onAdd={(r) => {
          setBuilding(false);
          const add = 'food' in r ? [fromFood(r.food)] : r.items;
          setPicked((p) => ({ ...p, ...Object.fromEntries(add.map((i) => [i.key === 'base' ? `pan:${i.foodId}` : i.key, { ...i, key: i.key === 'base' ? `pan:${i.foodId}` : i.key }])) }));
          void tapSuccess();
        }}
      />
      <CreateFoodSheet
        isOpen={creating}
        initialName={query.trim()}
        barcode={unknownBarcode}
        onClose={() => {
          setCreating(false);
          setUnknownBarcode(null);
        }}
        onCreated={(food) => {
          setCreating(false);
          setUnknownBarcode(null);
          setResults((r) => [food, ...(r ?? [])]);
          const item = fromFood(food);
          setPicked((p) => ({ ...p, [item.key]: item }));
        }}
      />
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

function PortionStepper({ name, factor, onChange }: { name: string; factor: number; onChange: (f: number) => void }) {
  return (
    <span className="addfood__portion" role="group" aria-label={`Ración de ${name}`}>
      <button type="button" aria-label="Un poco menos" onClick={() => onChange(stepFactor(factor, -1))}>
        −
      </button>
      <button
        type="button"
        className="addfood__portion-value"
        aria-label={`Ración ${factorLabel(factor)}: toca para cambiar`}
        onClick={() => onChange(nextQuickFactor(factor))}
      >
        {factor === 1 ? '×1' : factorLabel(factor)}
      </button>
      <button type="button" aria-label="Un poco más" onClick={() => onChange(stepFactor(factor, 1))}>
        +
      </button>
    </span>
  );
}
