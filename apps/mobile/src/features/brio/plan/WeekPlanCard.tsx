import { Link } from 'react-router-dom';
import { Chevron } from '../ui/kit';
import { StatusIcon } from './PlanPage';
import { dayMeta, dayNumber, dayShort, titleOf } from './plan-labels';
import type { PlanWeek } from './plan.api';

/**
 * «Tu semana de entreno» en Hoy (el Plan ya no es una pestaña): las sesiones de
 * la semana de un vistazo; cada día abre su sesión y «Editar semana» lleva al
 * plan completo (plantillas, objetivo, repetir semana).
 */
export function WeekPlanCard({ week }: { week: PlanWeek }) {
  const s = week.summary;
  return (
    <section aria-labelledby="semana" className="rk-section week-plan">
      <div className="week-plan__head">
        <span id="semana" className="week-plan__title">
          Tu semana de entreno
        </span>
        <Link to="/tabs/today/plan" className="rk-textbtn">
          Editar semana
        </Link>
      </div>
      <span className="rk-row__sub week-plan__sub">
        {s.planned ? `${s.done} de ${s.planned} sesiones hechas` : 'Aún no tienes sesiones esta semana'}
      </span>
      <ul className="rk-list">
        {week.days.map((d) => {
          const isToday = d.day === week.today;
          return (
            <li key={d.day}>
              <Link to={`/tabs/today/plan/sesion/${d.day}`} className="rk-row week-plan__row">
                <span className="week-plan__icon" aria-hidden="true">
                  <StatusIcon day={d} />
                </span>
                <span className="rk-row__main">
                  <span className="rk-row__title">{titleOf(d)}</span>
                  <span className="rk-row__sub">{dayMeta(d)}</span>
                </span>
                <span className={`week-plan__day${isToday ? ' is-today' : ''}`}>
                  {isToday ? 'Hoy' : `${dayShort(d.day)} ${dayNumber(d.day)}`}
                </span>
                <Chevron />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
