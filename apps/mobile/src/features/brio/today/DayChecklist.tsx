import { Link } from 'react-router-dom';
import type { DaySummary, MealHabits, MealType } from '../api';
import { suggestionFor } from './suggestion';
import { MEAL_HOUR, MEAL_ORDER, formatDuration, formatKcal, joinNames, mealLabel, timeIn } from '../format';
import { CheckCircle, Chevron } from '../ui/kit';

/**
 * «Tu día» como lista de comprobación: cada comida en su orden y el entreno,
 * con el check marcado cuando ya está hecho y lo que comiste o entrenaste.
 * Lo que falta se añade de un toque (hoy, con «lo de siempre» de esa comida
 * si lo hay). Sirve igual para hoy y para un día pasado.
 */
export function DayChecklist({
  summary,
  isToday,
  pending,
  habitsByMeal,
  plannedWorkout,
  timezone,
  onAdd,
  onAddWorkout,
}: {
  summary: DaySummary;
  isToday: boolean;
  /** Comidas que aún tocan hoy (las de horas pasadas cuentan como olvidadas). */
  pending: MealType[];
  habitsByMeal: Partial<Record<MealType, MealHabits>>;
  /** Título del entreno del plan de ese día, si hay. */
  plannedWorkout: string | null;
  timezone: string;
  onAdd: (type: MealType) => void;
  onAddWorkout: () => void;
}) {
  const sessions = summary.sessions;
  const doneMeals = MEAL_ORDER.filter((t) => summary.meals.some((m) => m.mealType === t)).length;
  const total = MEAL_ORDER.length + 1;
  const doneCount = doneMeals + (sessions.length > 0 ? 1 : 0);
  return (
    <section aria-labelledby="tu-dia" className="today-day">
      <div className="today-day__head">
        <span id="tu-dia" className="rk-kicker">
          {isToday ? 'Tu día' : 'Ese día'}
        </span>
        <span className="today-day__count" aria-label={`${doneCount} de ${total} hechos`}>
          {doneCount}/{total}
        </span>
      </div>
      {MEAL_ORDER.map((type) => {
        const entries = summary.meals.filter((m) => m.mealType === type);
        const on = entries.length > 0;
        const kcal = entries.reduce((t, m) => t + m.kcal, 0);
        const usual = !on && isToday && pending.includes(type) ? suggestionFor(type, habitsByMeal[type]) : null;
        const sub = on
          ? joinNames(entries.map((e) => e.name))
          : usual
            ? `Lo de siempre · ${formatKcal(usual.kcal)} kcal`
            : isToday && pending.includes(type)
              ? 'Sin registrar'
              : 'Sin registrar · toca para añadir';
        return (
          <button
            key={type}
            type="button"
            className={`today-day__row${on ? ' is-done' : ''}`}
            onClick={() => onAdd(type)}
          >
            <CheckCircle on={on} color="var(--brio-activity)" />
            <span className="rk-row__main">
              <span className="rk-row__title">{mealLabel(type)}</span>
              <span className="rk-row__sub">{sub}</span>
            </span>
            <span className="rk-row__value">
              {on ? `${formatKcal(kcal)} kcal` : isToday ? MEAL_HOUR[type] : '+'}
            </span>
          </button>
        );
      })}
      {sessions.length ? (
        sessions.map((x) => {
          const body = (
            <>
              <CheckCircle on color="var(--brio-activity)" />
              <span className="rk-row__main">
                <span className="rk-row__title">{x.activityTypeName}</span>
                <span className="rk-row__sub">
                  {formatDuration(x.durationSec)} · {formatKcal(x.kcalBurned)} kcal
                </span>
              </span>
              <span className="rk-row__value">{timeIn(x.startedAt, timezone)}</span>
            </>
          );
          // Los entrenos de fuerza se abren para editar sus series.
          return x.kind === 'STRENGTH' ? (
            <Link key={x.id} to={`/tabs/today/entreno/${x.id}`} className="today-day__row is-done">
              {body}
              <Chevron />
            </Link>
          ) : (
            <div key={x.id} className="today-day__row is-done">
              {body}
            </div>
          );
        })
      ) : (
        <button type="button" className="today-day__row" onClick={onAddWorkout}>
          <CheckCircle on={false} />
          <span className="rk-row__main">
            <span className="rk-row__title">Entreno</span>
            <span className="rk-row__sub">
              {plannedWorkout ? `Toca: ${plannedWorkout}` : isToday ? 'Sin entreno' : 'Sin entreno · toca para añadir'}
            </span>
          </span>
          <span className="rk-row__value">+</span>
        </button>
      )}
    </section>
  );
}
