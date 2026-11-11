import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonModal } from '@ionic/react';
import type { MealType } from './api';
import { formatKcal, joinNames, mealLabel, nowIn } from './format';
import { useRitmoStore } from './ritmo.store';
import { useRegisterStore } from './register.store';
import { useHabitsStore } from './habits.store';
import { useWaterStore, WATER_GOAL } from './water.store';
import { deleteEntries, logItems } from './relog';
import { tapSuccess } from './haptics';
import { FoodIcon } from './ui/food-icons';
import { Icon, SectionHeader, SheetBar } from './ui/kit';
import { PATHS } from './ui/paths';
import { AddFoodSheet } from './sheets/AddFoodSheet';
import { WorkoutSheet } from './sheets/WorkoutSheet';
import { WeightSheet } from './sheets/WeightSheet';
import { CopyMealsSheet } from './sheets/CopyMealsSheet';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import './sheets/sheets.css';

const MEAL_LOGGED: Record<MealType, string> = {
  BREAKFAST: 'Desayuno registrado',
  LUNCH: 'Comida registrada',
  SNACK: 'Merienda registrada',
  DINNER: 'Cena registrada',
};

type Domain = 'food' | 'activity' | 'sleep';

/**
 * Hoja "Registrar" (lo que abre el + de la tab bar) y todas las hojas de
 * registro, montadas una vez en el shell. Sigue el lienzo "Registrar (+)": lo
 * más probable a esta hora listo para un toque, el agua y el resto de cosas
 * que se pueden apuntar.
 *
 * Del diseño se omiten Escanear, Foto del plato y Digestión: aún no existen, y
 * una tesela que no hace lo que dice es peor que no tenerla.
 */
export function RegisterSheets() {
  const history = useHistory();
  const sheet = useRegisterStore((s) => s.sheet);
  const mealType = useRegisterStore((s) => s.mealType);
  const open = useRegisterStore((s) => s.open);
  const close = useRegisterStore((s) => s.close);
  const day = useRitmoStore((s) => s.day);
  const profile = useRitmoStore((s) => s.profile);
  const refreshDay = useRitmoStore((s) => s.refreshDay);
  const habits = useHabitsStore((s) => s.byMeal[mealType]);
  const loadHabits = useHabitsStore((s) => s.load);
  const invalidateHabits = useHabitsStore((s) => s.invalidate);
  const water = useWaterStore((s) => s.byDay[day] ?? 0);
  const addWater = useWaterStore((s) => s.add);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (sheet === 'menu') void loadHabits(mealType);
  }, [sheet, mealType, loadHabits]);

  const combo = habits?.combos[0] ?? null;
  const suggestion = combo
    ? { items: combo.items, kcal: combo.kcal }
    : habits?.frequent[0] && habits.frequent[0].count >= 2
      ? { items: [habits.frequent[0]], kcal: Math.round(habits.frequent[0].kcal) }
      : null;

  async function logSuggestion() {
    if (!suggestion) return;
    setLogging(true);
    try {
      const created = await logItems(suggestion.items, mealType, day);
      await refreshDay();
      invalidateHabits();
      void tapSuccess();
      close();
      const kcal = created.reduce((s, e) => s + e.kcal, 0);
      snackbar.undo(`${MEAL_LOGGED[mealType]} · ${formatKcal(kcal)} kcal`, async () => {
        await deleteEntries(created.map((c) => c.id));
        await refreshDay();
        invalidateHabits();
      });
    } catch {
      toast.error('No se pudo registrar');
    } finally {
      setLogging(false);
    }
  }

  const actions: { label: string; icon: string; domain: Domain; run: () => void }[] = [
    { label: 'Comida', icon: PATHS.fork, domain: 'food', run: () => open('meal', mealType) },
    { label: 'Copiar día', icon: PATHS.copy, domain: 'food', run: () => open('copy') },
    {
      label: 'Receta',
      icon: PATHS.book,
      domain: 'food',
      run: () => {
        close();
        history.push('/tabs/today/recetas');
      },
    },
    { label: 'Entreno', icon: PATHS.run, domain: 'activity', run: () => open('activity') },
    { label: 'Peso', icon: PATHS.scale, domain: 'sleep', run: () => open('weight') },
  ];

  return (
    <>
      <IonModal
        className="ritmo-sheet-auto"
        isOpen={sheet === 'menu'}
        onDidDismiss={() => {
          if (useRegisterStore.getState().sheet === 'menu') close();
        }}
        initialBreakpoint={1}
        breakpoints={[0, 1]}
        handle
      >
        <div className="rk-sheet register">
          <SheetBar title="Registrar" cancelLabel="Cerrar" onCancel={close} />
          <span className="register__hint">
            Son las {nowIn(profile?.timezone ?? 'Europe/Madrid')} · lo más probable ahora
          </span>

          {suggestion ? (
            <section aria-label="Sugerencia" className="register__suggest">
              <div className="register__suggest-row">
                <FoodIcon name={suggestion.items[0].name} size={48} />
                <span className="rk-row__main">
                  <span className="register__suggest-kicker">{mealLabel(mealType)} · lo de siempre</span>
                  <span className="register__suggest-name">{joinNames(suggestion.items.map((i) => i.name))}</span>
                  <span className="rk-row__sub">{formatKcal(suggestion.kcal)} kcal</span>
                </span>
              </div>
              <button type="button" className="rk-btn rk-btn--small" disabled={logging} onClick={() => void logSuggestion()}>
                Registrar {mealLabel(mealType).toLowerCase()}
              </button>
            </section>
          ) : null}

          <section aria-label="Agua" className="register__water">
            <span className="register__water-main">
              <span className="register__water-title">
                Agua · {water} de {WATER_GOAL} vasos
              </span>
              <span className="register__glasses" aria-hidden="true">
                {Array.from({ length: WATER_GOAL }, (_, i) => (
                  <span key={i} className={i < water ? 'is-full' : undefined} />
                ))}
              </span>
            </span>
            <button type="button" className="register__water-btn" aria-label="Un vaso menos" onClick={() => addWater(day, -1)}>
              −
            </button>
            <button
              type="button"
              className="register__water-btn register__water-btn--plus"
              aria-label="Un vaso más"
              onClick={() => addWater(day, 1)}
            >
              +
            </button>
          </section>

          <section aria-labelledby="mas" className="rk-section">
            <SectionHeader id="mas">Otra cosa</SectionHeader>
            <div className="register__grid">
              {actions.map((a) => (
                <button key={a.label} type="button" className="register__tile" onClick={a.run}>
                  <span className={`register__icon register__icon--${a.domain}`} aria-hidden="true">
                    <Icon d={a.icon} size={22} />
                  </span>
                  <span className="register__label">{a.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </IonModal>

      <AddFoodSheet isOpen={sheet === 'meal'} initialMealType={mealType} onClose={close} />
      <WorkoutSheet isOpen={sheet === 'activity'} onClose={close} />
      <WeightSheet isOpen={sheet === 'weight'} onClose={close} />
      <CopyMealsSheet isOpen={sheet === 'copy'} onClose={close} />
    </>
  );
}
