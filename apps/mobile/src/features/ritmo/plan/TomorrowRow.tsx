import { Link } from 'react-router-dom';
import { formatNumber } from '../format';
import { Chevron } from '../ui/kit';
import { usePlanWeekData } from './plan.api';
import { LOAD_LABEL, fmtMinutes, shiftDay } from './plan-labels';

/** Fila "Mañana" de Hoy: la sesión planificada y la dieta que le toca. */
export function TomorrowRow({ today }: { today: string }) {
  const tomorrow = shiftDay(today, 1);
  const { data } = usePlanWeekData(tomorrow);
  if (!data) return null;
  const planned = data.days.find((d) => d.day === tomorrow)?.planned ?? null;
  const diet = data.diet?.find((d) => d.day === tomorrow) ?? null;

  const title = planned
    ? [planned.title, planned.startTime].filter(Boolean).join(' · ')
    : 'Nada planificado';
  const sub = planned
    ? [
        planned.load === 'REST' ? 'Descanso' : `Carga ${LOAD_LABEL[planned.load].toLowerCase()}`,
        planned.plannedDurationMin ? fmtMinutes(planned.plannedDurationMin) : null,
        diet ? `dieta de ${formatNumber(diet.kcalTarget)} kcal` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Planifica tu semana';

  return (
    <Link to={planned ? `/tabs/plan/sesion/${tomorrow}` : '/tabs/plan'} className="today-row">
      <span className="today-tomorrow">Mañana</span>
      <span className="rk-row__main">
        <span className="today-row__title">{title}</span>
        <span className="rk-row__sub">{sub}</span>
      </span>
      <Chevron />
    </Link>
  );
}
