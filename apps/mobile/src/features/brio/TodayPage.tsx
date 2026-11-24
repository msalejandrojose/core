import { LiveWorkoutBanner } from './live/LiveWorkoutBanner';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
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
  dayLabel,
  longDate,
  mealForHour,
  mealLabel,
  timeIn,
  todayIn,
} from './format';
import { useBrioStore } from './brio.store';
import { useRegisterStore } from './register.store';
import { useHabitsStore } from './habits.store';
import { deleteEntries, logItems } from './relog';
import { tapSuccess } from './haptics';
import { FoodIcon } from './ui/food-icons';
import { CheckCircle, Chevron, Icon } from './ui/kit';
import { PATHS } from './ui/paths';
import { FirstDay } from './FirstDay';
import { isFirstDay } from './first-day';
import { ErrorState, SkeletonList } from '@/components/ux';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import './brio.css';
import { RecoveryRow } from './pages/RecoveryRow';
import { TomorrowRow } from './plan/TomorrowRow';
import { WeekPlanCard } from './plan/WeekPlanCard';
import './plan/plan.css';
import { usePlanWeekData } from './plan/plan.api';
import { useRecentHealth } from './profile/garmin.api';
import { DayRingsCard, TodayWorkoutCard, WeekStrip } from './today/TodayVisuals';
import { dayRings, greeting } from './today/today-visuals';
import { DaySwipe } from './today/DaySwipe';
import { useAuthStore } from '@/store/auth.store';
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

/** Fecha corta para la cabecera con flechas: «miércoles, 18 nov». */
function shortDate(day: string): string {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${day}T12:00:00Z`))
    .replace('.', '');
}

/** Título de un día que no es hoy: «Ayer», «Lunes» (esta semana) o «3 nov». */
function pastTitle(day: string, today: string): string {
  const diff = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86_400_000);
  if (diff > 1 && diff < 7) {
    const wd = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
    return wd.charAt(0).toUpperCase() + wd.slice(1);
  }
  return dayLabel(day, today);
}

/**
 * Comidas de un día pasado: qué se apuntó en cada momento (con sus kcal y
 * alimentos) y, en lo que falta, un toque para añadirlo a ese día.
 */
function PastDayMeals({
  summary,
  onAdd,
  onAddWorkout,
}: {
  summary: DaySummary;
  onAdd: (type: MealType) => void;
  onAddWorkout: () => void;
}) {
  return (
    <section aria-label="Comidas del día" className="today-day">
      {MEAL_ORDER.map((type) => {
        const entries = summary.meals.filter((m) => m.mealType === type);
        const kcal = entries.reduce((t, m) => t + m.kcal, 0);
        return (
          <button key={type} type="button" className="today-day__row" onClick={() => onAdd(type)}>
            <CheckCircle on={entries.length > 0} color="var(--brio-activity)" />
            <span className="rk-row__main">
              <span className="rk-row__title">{mealLabel(type)}</span>
              <span className="rk-row__sub">
                {entries.length ? joinNames(entries.map((e) => e.name)) : 'Sin registrar · toca para añadir'}
              </span>
            </span>
            <span className="rk-row__value">{entries.length ? `${formatKcal(kcal)} kcal` : '+'}</span>
          </button>
        );
      })}
      <button type="button" className="today-day__row" onClick={onAddWorkout}>
        <CheckCircle on={summary.sessions.length > 0} color="var(--brio-activity)" />
        <span className="rk-row__main">
          <span className="rk-row__title">Entreno</span>
          <span className="rk-row__sub">
            {summary.sessions.length
              ? joinNames(summary.sessions.map((x) => x.activityTypeName))
              : 'Sin entreno · toca para añadir'}
          </span>
        </span>
        <span className="rk-row__value">+</span>
      </button>
    </section>
  );
}

/**
 * Hoy (lienzo "Hoy"). Arriba, de un vistazo: la semana del plan, los anillos
 * del día (comida, entreno, pasos) con los macros y el entreno de hoy en
 * grande. Luego lo que toca comer con lo de siempre listo para registrar de un
 * toque, la recuperación, tu día y lo de mañana.
 *
 * Recuperación es una estimación con tu reloj y tu carga; "Mañana" sale de tu plan.
 */
export default function TodayPage() {
  const profile = useBrioStore((s) => s.profile);
  const profileStatus = useBrioStore((s) => s.profileStatus);
  const needsOnboarding = useBrioStore((s) => s.needsOnboarding);
  const day = useBrioStore((s) => s.day);
  const summary = useBrioStore((s) => s.summary);
  const dayStatus = useBrioStore((s) => s.dayStatus);
  const loadProfile = useBrioStore((s) => s.loadProfile);
  const loadDay = useBrioStore((s) => s.loadDay);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const goToToday = useBrioStore((s) => s.goToToday);
  const stepDay = useBrioStore((s) => s.stepDay);
  const openRegister = useRegisterStore((s) => s.open);
  const habitsByMeal = useHabitsStore((s) => s.byMeal);
  const loadHabits = useHabitsStore((s) => s.load);
  const invalidateHabits = useHabitsStore((s) => s.invalidate);
  const unread = useUnreadStore((s) => s.unread);
  const [showDone, setShowDone] = useState(false);
  const [logging, setLogging] = useState(false);

  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const today = todayIn(timezone);
  const firstName = useAuthStore((s) => s.user?.firstName ?? null);
  /** El día que se ve: hoy, o el que elijas con las flechas o la semana. */
  const isToday = day === today;
  const { data: week } = usePlanWeekData(day);
  const health = useRecentHealth();

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  // Sin perfil → alta. Se navega desde un efecto y la página sigue pintando su
  // IonPage: un <Redirect> en lugar de la página deja al router de Ionic sin
  // elemento de página (falla `isViewVisible`) y la pila acaba descolocada.
  const history = useHistory();
  const toOnboarding = profileStatus === 'ready' && needsOnboarding;
  useEffect(() => {
    if (toOnboarding) history.replace('/alta/perfil');
  }, [toOnboarding, history]);

  useEffect(() => {
    if (profileStatus === 'ready' && !needsOnboarding && dayStatus === 'idle') {
      void loadDay();
    }
  }, [profileStatus, needsOnboarding, dayStatus, loadDay]);

  // A medianoche, si estabas viendo «hoy», pasa al nuevo hoy. Si estabas en
  // otro día lo respeta; ni el futuro ni un día por delante de hoy.
  const lastToday = useRef(today);
  useEffect(() => {
    const prev = lastToday.current;
    lastToday.current = today;
    if (dayStatus !== 'ready') return;
    if ((prev !== today && day === prev) || day > today) void goToToday();
  }, [dayStatus, day, today, goToToday]);

  const pending = useMemo(
    () => (summary && isToday ? pendingMeals(summary, hourIn(timezone)) : []),
    [summary, timezone, isToday],
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

  if (toOnboarding) {
    return (
      <IonPage>
        <IonContent />
      </IonPage>
    );
  }

  const suggestion = next ? suggestionFor(next, habitsByMeal[next]) : null;
  const firstDay = isFirstDay(profile, today, timezone);
  const totals = summary?.totals;
  const remaining = totals?.kcalRemaining ?? null;

  // Cabecera visual: semana, anillos del día y el entreno de hoy.
  const todayPlan = week?.days.find((d) => d.day === day) ?? null;
  const todayDiet = week?.diet?.find((d) => d.day === day) ?? null;
  const activeMinutes = Math.round((summary?.sessions ?? []).reduce((m, x) => m + x.durationSec, 0) / 60);
  const steps = health?.days.find((d) => d.day === day)?.steps ?? null;
  const rings = totals
    ? dayRings({
        totals,
        activeMinutes,
        plannedMinutes: todayPlan?.planned?.load === 'REST' ? null : (todayPlan?.planned?.plannedDurationMin ?? null),
        steps,
      })
    : [];
  const macroTargets = {
    proteinG: todayDiet?.proteinG ?? profile?.proteinTargetG ?? null,
    carbsG: todayDiet?.carbsG ?? profile?.carbsTargetG ?? null,
    fatG: todayDiet?.fatG ?? profile?.fatTargetG ?? null,
  };

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
        { tone: 'food', icon: 'food', undone: 'Comida quitada' },
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
          // Los entrenos de fuerza se abren para editar sus series.
          to: s.kind === 'STRENGTH' ? `/tabs/today/entreno/${s.id}` : undefined,
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
            <div className="today-head__row">
              <div className="today-nav">
                <button
                  type="button"
                  className="today-nav__arrow"
                  aria-label="Día anterior"
                  onClick={() => void stepDay(-1)}
                >
                  <Icon d={PATHS.back} size={16} stroke={2.6} />
                </button>
                <span className="today-head__kicker" aria-live="polite" aria-label={longDate(day)}>
                  {shortDate(day)}
                </span>
                <button
                  type="button"
                  className="today-nav__arrow"
                  aria-label="Día siguiente"
                  disabled={isToday}
                  onClick={() => void stepDay(1)}
                >
                  <Icon d={PATHS.forward} size={16} stroke={2.6} />
                </button>
              </div>
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
                <Link to="/tabs/today/coach" className="rk-iconbtn" aria-label="Coach">
                  <Icon d={PATHS.chat} />
                </Link>
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
            {isToday ? (
              <h1 className={firstDay ? undefined : 'is-greeting'}>{firstDay ? 'Hoy' : greeting(hourIn(timezone), firstName)}</h1>
            ) : (
              <div className="today-past">
                <h1>{pastTitle(day, today)}</h1>
                <button type="button" className="today-past__back" onClick={() => void goToToday()}>
                  Volver a hoy
                </button>
              </div>
            )}
          </header>

          <LiveWorkoutBanner />

          {profileStatus === 'error' ? (
            // Sin perfil no se carga el día: sin esto se quedaba para siempre
            // en el esqueleto (API caída, URL inalcanzable o sin red).
            <ErrorState
              message="No se pudo conectar con Brío. Comprueba tu conexión e inténtalo de nuevo."
              onRetry={() => void loadProfile()}
            />
          ) : dayStatus === 'error' ? (
            <ErrorState
              message="No se pudo cargar el día."
              onRetry={() => void loadDay()}
            />
          ) : !summary || !totals ? (
            <SkeletonList rows={5} />
          ) : firstDay && isToday ? (
            <FirstDay profile={profile} summary={summary} />
          ) : (
            <>
              {week ? (
                <WeekStrip days={week.days} today={today} selected={day} onSelect={(d) => void loadDay(d)} />
              ) : null}

              <DaySwipe day={summary.day} canGoNext={!isToday} onStep={(d) => void stepDay(d)}>
                <DayRingsCard rings={rings} totals={totals} targets={macroTargets} />
              </DaySwipe>

              <TodayWorkoutCard
                day={todayPlan}
                doneMinutes={activeMinutes}
                done={(summary?.sessions ?? []).map((x) => ({
                  id: x.id,
                  name: x.activityTypeName,
                  kind: x.kind ?? 'OTHER',
                  code: x.activityTypeCode,
                  durationSec: x.durationSec,
                  kcal: x.kcalBurned,
                  to: x.kind === 'STRENGTH' ? `/tabs/today/entreno/${x.id}` : undefined,
                }))}
                isToday={isToday}
                onStart={() => openRegister('activity')}
              />

              {isToday ? (
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
              <RecoveryRow />

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
                  <CheckCircle on color="var(--brio-activity)" />
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
                  ? done.map((d) =>
                      'to' in d && d.to ? (
                        <Link key={d.key} to={d.to} className="today-day__done today-day__done--link">
                          <span>
                            {d.title} · {d.meta}
                          </span>
                          <span className="rk-row__value">{d.time}</span>
                          <Chevron />
                        </Link>
                      ) : (
                        <div key={d.key} className="today-day__done">
                          <span>
                            {d.title} · {d.meta}
                          </span>
                          <span className="rk-row__value">{d.time}</span>
                        </div>
                      ),
                    )
                  : null}
              </section>

              <TomorrowRow today={today} />
              </>
              ) : (
                <PastDayMeals summary={summary} onAdd={(t) => openRegister('meal', t)} onAddWorkout={() => openRegister('activity')} />
              )}

              {week ? <WeekPlanCard week={week} /> : null}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
