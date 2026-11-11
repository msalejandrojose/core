import { useEffect, useMemo, useState } from 'react';
import { Link, Redirect } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import type { DaySummary, HabitItem, MealHabits, MealType } from './api';
import {
  MEAL_HOUR,
  MEAL_ORDER,
  formatDuration,
  formatKcal,
  hourIn,
  joinNames,
  longDate,
  mealForHour,
  mealLabel,
  nowIn,
  timeIn,
  todayIn,
} from './format';
import { useRitmoStore } from './ritmo.store';
import { useRegisterStore } from './register.store';
import { useHabitsStore } from './habits.store';
import { deleteEntries, logItems } from './relog';
import { tapSuccess } from './haptics';
import { FoodIcon } from './ui/food-icons';
import { CheckCircle, Chevron, ExampleTag, Icon, Ring } from './ui/kit';
import { PATHS } from './ui/paths';
import { FirstDay } from './FirstDay';
import { isFirstDay } from './first-day';
import { ErrorState, SkeletonList } from '@/components/ux';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import './ritmo.css';
import './today.css';

/** Mensaje en pasado tras registrar una comida, con su género. */
const MEAL_LOGGED: Record<MealType, string> = {
  BREAKFAST: 'Desayuno registrado',
  LUNCH: 'Comida registrada',
  SNACK: 'Merienda registrada',
  DINNER: 'Cena registrada',
};

/** "¿Te faltan la comida y la merienda? Añádelas con el +." */
function missedText(missed: MealType[]): string {
  const withArticle = missed.map(
    (t) => `${t === 'BREAKFAST' ? 'el' : 'la'} ${mealLabel(t).toLowerCase()}`,
  );
  if (missed.length === 1) {
    return `¿Te falta ${withArticle[0]}? ${missed[0] === 'BREAKFAST' ? 'Añádelo' : 'Añádela'} con el +.`;
  }
  const masculine = missed.includes('BREAKFAST');
  return `¿Te faltan ${joinNames(withArticle)}? ${masculine ? 'Añádelos' : 'Añádelas'} con el +.`;
}

interface Suggestion {
  mealType: MealType;
  items: HabitItem[];
  kcal: number;
  count: number;
}

/** "Lo de siempre" de una comida, o su alimento más frecuente si no hay combinación. */
function suggestionFor(
  mealType: MealType,
  habits: MealHabits | undefined,
): Suggestion | null {
  if (!habits) return null;
  const combo = habits.combos[0];
  if (combo)
    return {
      mealType,
      items: combo.items,
      kcal: combo.kcal,
      count: combo.count,
    };
  const top = habits.frequent[0];
  if (top && top.count >= 2)
    return {
      mealType,
      items: [top],
      kcal: Math.round(top.kcal),
      count: top.count,
    };
  return null;
}

/** Comidas sin registrar hoy, empezando por la que toca a esta hora. */
function pendingMeals(summary: DaySummary, hour: number): MealType[] {
  const logged = new Set(summary.meals.map((m) => m.mealType));
  const now = MEAL_ORDER.indexOf(mealForHour(hour));
  return MEAL_ORDER.filter((t, i) => i >= now && !logged.has(t));
}

/**
 * Hoy (lienzo "Hoy"). La pantalla responde a "¿qué hago ahora?": arriba lo
 * que toca con lo de siempre listo para registrar de un toque, luego las kcal
 * que quedan, la recuperación, tu día y lo de mañana.
 *
 * Recuperación y "Mañana" necesitan Garmin y el plan de entrenamiento, que
 * aún no existen: se muestran con datos de ejemplo y su etiqueta.
 */
export default function TodayPage() {
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const needsOnboarding = useRitmoStore((s) => s.needsOnboarding);
  const day = useRitmoStore((s) => s.day);
  const summary = useRitmoStore((s) => s.summary);
  const dayStatus = useRitmoStore((s) => s.dayStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const loadDay = useRitmoStore((s) => s.loadDay);
  const refreshDay = useRitmoStore((s) => s.refreshDay);
  const goToToday = useRitmoStore((s) => s.goToToday);
  const openRegister = useRegisterStore((s) => s.open);
  const habitsByMeal = useHabitsStore((s) => s.byMeal);
  const loadHabits = useHabitsStore((s) => s.load);
  const invalidateHabits = useHabitsStore((s) => s.invalidate);
  const unread = useUnreadStore((s) => s.unread);
  const [showDone, setShowDone] = useState(false);
  const [logging, setLogging] = useState(false);

  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const today = todayIn(timezone);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  useEffect(() => {
    if (profileStatus === 'ready' && !needsOnboarding && dayStatus === 'idle') {
      void loadDay();
    }
  }, [profileStatus, needsOnboarding, dayStatus, loadDay]);

  // Hoy siempre enseña hoy: si en Comida se navegó a otro día, se vuelve.
  useEffect(() => {
    if (dayStatus === 'ready' && day !== today) void goToToday();
  }, [dayStatus, day, today, goToToday]);

  const pending = useMemo(
    () => (summary ? pendingMeals(summary, hourIn(timezone)) : []),
    [summary, timezone],
  );
  const next = pending[0] ?? null;
  // Comidas de antes de esta hora que se quedaron sin registrar.
  const missed = summary
    ? MEAL_ORDER.filter(
        (t) =>
          !pending.includes(t) && !summary.meals.some((m) => m.mealType === t),
      )
    : [];

  useEffect(() => {
    for (const type of pending) void loadHabits(type);
  }, [pending, loadHabits]);

  if (profileStatus === 'ready' && needsOnboarding) {
    return <Redirect to="/alta/perfil" />;
  }

  const suggestion = next ? suggestionFor(next, habitsByMeal[next]) : null;
  const firstDay = isFirstDay(profile, today, timezone);
  const totals = summary?.totals;
  const remaining = totals?.kcalRemaining ?? null;

  async function logSuggestion(s: Suggestion) {
    setLogging(true);
    try {
      const created = await logItems(s.items, s.mealType);
      await refreshDay();
      invalidateHabits();
      void tapSuccess();
      const kcal = created.reduce((sum, e) => sum + e.kcal, 0);
      snackbar.undo(
        `${MEAL_LOGGED[s.mealType]} · ${formatKcal(kcal)} kcal`,
        async () => {
          await deleteEntries(created.map((c) => c.id));
          await refreshDay();
          invalidateHabits();
        },
      );
    } catch {
      toast.error('No se pudo registrar');
    } finally {
      setLogging(false);
    }
  }

  // "Hecho hoy": comidas registradas (una fila por momento) y entrenos.
  const done = summary
    ? [
        ...MEAL_ORDER.filter((t) =>
          summary.meals.some((m) => m.mealType === t),
        ).map((t) => ({
          key: t,
          title: mealLabel(t),
          meta: `${formatKcal(summary.meals.filter((m) => m.mealType === t).reduce((s, m) => s + m.kcal, 0))} kcal`,
          time: MEAL_HOUR[t],
        })),
        ...summary.sessions.map((s) => ({
          key: s.id,
          title: s.activityTypeName,
          meta: `${formatDuration(s.durationSec)} · ${formatKcal(s.kcalBurned)} kcal`,
          time: timeIn(s.startedAt, timezone),
        })),
      ]
    : [];

  return (
    <IonPage>
      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            invalidateHabits();
            await Promise.all([loadProfile(), refreshDay()]);
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="rk-screen today">
          <header className="today-head">
            <span className="today-head__kicker">
              {firstDay
                ? longDate(today)
                : `${longDate(today)} · ${nowIn(timezone)}`}
            </span>
            <div className="today-head__row">
              <h1>Hoy</h1>
              <div className="today-head__actions">
                {firstDay ? null : (
                  <Link
                    to="/tabs/today/avisos"
                    className="rk-iconbtn"
                    aria-label={
                      unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'
                    }
                  >
                    <Icon d={PATHS.bell} />
                    {unread > 0 ? (
                      <span className="today-head__dot" aria-hidden="true" />
                    ) : null}
                  </Link>
                )}
                <Link
                  to="/tabs/settings"
                  className="rk-iconbtn"
                  aria-label="Perfil"
                >
                  <span className="today-avatar" aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="9" r="4" />
                      <path d="M4 21a8 7 0 0 1 16 0z" />
                    </svg>
                  </span>
                </Link>
              </div>
            </div>
          </header>

          {dayStatus === 'error' ? (
            <ErrorState
              message="No se pudo cargar el día."
              onRetry={() => void loadDay()}
            />
          ) : !summary || !totals ? (
            <SkeletonList rows={5} />
          ) : firstDay ? (
            <FirstDay profile={profile} summary={summary} />
          ) : (
            <>
              <section aria-labelledby="ahora" className="rk-hero today-now">
                <span id="ahora" className="rk-kicker">
                  {next ? 'Ahora toca' : 'Hoy'}
                </span>
                {next ? (
                  <>
                    <div className="today-now__text">
                      <span className="today-now__title">
                        {mealLabel(next)}
                      </span>
                      <span className="today-now__body">
                        {remaining !== null && remaining > 0
                          ? `Te quedan ${formatKcal(remaining)} kcal.`
                          : 'Ya has llegado a tu objetivo de hoy.'}
                        {suggestion ? ' ¿Lo de siempre?' : ''}
                      </span>
                    </div>
                    {suggestion ? (
                      <>
                        <div className="today-now__pick">
                          <FoodIcon name={suggestion.items[0].name} size={40} />
                          <span className="rk-row__main">
                            <span className="today-now__pick-name">
                              {joinNames(suggestion.items.map((i) => i.name))}
                            </span>
                            <span className="rk-row__sub">
                              {formatKcal(suggestion.kcal)} kcal ·{' '}
                              {suggestion.count} veces
                            </span>
                          </span>
                        </div>
                        <div className="today-now__actions">
                          <button
                            type="button"
                            className="rk-btn rk-btn--small"
                            disabled={logging}
                            onClick={() => void logSuggestion(suggestion)}
                          >
                            Registrar
                          </button>
                          <button
                            type="button"
                            className="rk-btn rk-btn--soft rk-btn--small"
                            onClick={() => openRegister('meal', next)}
                          >
                            Otra
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rk-btn rk-btn--small"
                        onClick={() => openRegister('meal', next)}
                      >
                        Añadir {mealLabel(next).toLowerCase()}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="today-now__text">
                    <span className="today-now__title">
                      {missed.length ? 'Nada más por ahora' : 'Día completo'}
                    </span>
                    <span className="today-now__body">
                      {missed.length
                        ? missedText(missed)
                        : 'Has registrado todas las comidas de hoy.'}
                    </span>
                  </div>
                )}
              </section>

              <Link to="/tabs/today/comida" className="today-row today-kcal">
                <Ring
                  size={52}
                  // Lo comido sobre lo disponible hoy (objetivo + lo gastado entrenando).
                  ratio={
                    totals.kcalTarget
                      ? totals.kcalIn / (totals.kcalTarget + totals.kcalBurned)
                      : 0
                  }
                  color="var(--ritmo-food)"
                />
                <span className="rk-row__main">
                  <span className="today-kcal__value">
                    {remaining === null
                      ? `${formatKcal(totals.kcalIn)} kcal hoy`
                      : remaining >= 0
                        ? `${formatKcal(remaining)} kcal restantes`
                        : `${formatKcal(-remaining)} kcal de más`}
                  </span>
                  <span className="rk-row__sub">
                    Comido {formatKcal(totals.kcalIn)} · entreno{' '}
                    {formatKcal(totals.kcalBurned)} kcal
                  </span>
                </span>
                <Chevron />
              </Link>

              <Link to="/tabs/today/recuperacion" className="today-row">
                <span className="today-recovery" aria-hidden="true">
                  58
                </span>
                <span className="rk-row__main">
                  <span className="today-row__title">
                    Recuperación moderada
                  </span>
                  <span className="rk-row__sub">
                    <ExampleTag /> Revisa las series de mañana
                  </span>
                </span>
                <Chevron />
              </Link>

              <section aria-label="Tu día" className="today-day">
                {pending.map((type) => {
                  const s = suggestionFor(type, habitsByMeal[type]);
                  return (
                    <button
                      key={type}
                      type="button"
                      className="today-day__row"
                      onClick={() => openRegister('meal', type)}
                    >
                      <CheckCircle on={false} />
                      <span className="rk-row__main">
                        <span className="rk-row__title">{mealLabel(type)}</span>
                        <span className="rk-row__sub">
                          {s
                            ? `Lo de siempre · ${formatKcal(s.kcal)} kcal`
                            : 'Sin registrar'}
                        </span>
                      </span>
                      <span className="rk-row__value">{MEAL_HOUR[type]}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="today-day__row today-day__toggle"
                  aria-expanded={showDone}
                  onClick={() => setShowDone((v) => !v)}
                >
                  <CheckCircle on color="var(--ritmo-activity)" />
                  <span className="rk-row__title today-day__toggle-label">
                    Hecho hoy · {done.length}
                  </span>
                  <span
                    className={`today-day__chevron${showDone ? ' is-open' : ''}`}
                  >
                    <Chevron />
                  </span>
                </button>
                {showDone
                  ? done.map((d) => (
                      <div key={d.key} className="today-day__done">
                        <span>
                          {d.title} · {d.meta}
                        </span>
                        <span className="rk-row__value">{d.time}</span>
                      </div>
                    ))
                  : null}
              </section>

              <Link to="/tabs/plan" className="today-row">
                <span className="today-tomorrow">Mañana</span>
                <span className="rk-row__main">
                  <span className="today-row__title">
                    Series 6 × 800 m · 7:30
                  </span>
                  <span className="rk-row__sub">
                    <ExampleTag /> Carga alta · dieta de 3.200 kcal
                  </span>
                </span>
                <Chevron />
              </Link>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
