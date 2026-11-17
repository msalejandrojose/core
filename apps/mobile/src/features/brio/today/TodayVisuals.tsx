import { Link } from 'react-router-dom';
import type { DayTotals } from '../api';
import { formatDuration } from '../format';
import type { PlanDay, PlannedSession } from '../plan/plan.api';
import { LOAD_LABEL, fmtMinutes } from '../plan/plan-labels';
import { Chevron } from '../ui/kit';
import { macroBars, weekDots, type DayRing, type WeekDot } from './today-visuals';
import './today-visuals.css';

/** Anillos concéntricos (de fuera a dentro), estilo «actividad» de iOS. */
function Rings({ rings, size }: { rings: DayRing[]; size: number }) {
  const stroke = 11;
  const gap = 3;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className="tv-rings__svg">
      {rings.map((r, i) => {
        const radius = 54 - i * (stroke + gap);
        const c = 2 * Math.PI * radius;
        // Más de una vuelta se queda en una vuelta llena: el texto dice el resto.
        const dash = Math.min(1, r.ratio) * c;
        return (
          <g key={r.key}>
            <circle cx="60" cy="60" r={radius} fill="none" stroke={r.soft} strokeWidth={stroke} />
            {dash > 0.5 ? (
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
                transform="rotate(-90 60 60)"
                className="tv-rings__arc"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Tarjeta del día: tres anillos con su leyenda y las barras de macros. */
export function DayRingsCard({
  rings,
  totals,
  targets,
}: {
  rings: DayRing[];
  totals: DayTotals;
  targets: { proteinG: number | null; carbsG: number | null; fatG: number | null };
}) {
  const macros = macroBars(totals, targets);
  return (
    <Link to="/tabs/today/comida" className="tv-card tv-rings" aria-label="Tu día: comida, entreno y pasos. Abrir comida.">
      <div className="tv-rings__top">
        <Rings rings={rings} size={112} />
        <ul className="tv-rings__legend">
          {rings.map((r) => (
            <li key={r.key}>
              <span className="tv-rings__dot" style={{ background: r.color }} aria-hidden="true" />
              <span className="tv-rings__label">{r.label}</span>
              <span className="tv-rings__value">{r.value}</span>
            </li>
          ))}
        </ul>
        <Chevron />
      </div>
      <div className="tv-macros">
        {macros.map((m) => (
          <div key={m.key} className="tv-macro">
            <span className="tv-macro__label">{m.label}</span>
            <span className="tv-macro__bar" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.min(1, m.ratio)})`, background: m.color }} />
            </span>
            <span className="tv-macro__value">
              {m.grams}
              {m.target ? `/${m.target}` : ''} g
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function Dot({ d }: { d: WeekDot }) {
  return (
    <span className={`tv-week__dot is-${d.state}`} aria-hidden="true">
      {d.state === 'done' ? (
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

/** Tira de la semana del plan: un punto por día (hecho, falló, planificado, descanso). */
export function WeekStrip({ days, today }: { days: PlanDay[]; today: string }) {
  const dots = weekDots(days, today);
  if (!dots.length) return null;
  return (
    <Link to="/tabs/plan" className="tv-week" aria-label={`Tu semana. ${dots.map((d) => d.label).join(', ')}. Abrir plan.`}>
      {dots.map((d) => (
        <span key={d.day} className={`tv-week__day${d.state === 'today' ? ' is-today' : ''}`}>
          <span className="tv-week__letter">{d.letter}</span>
          <Dot d={d} />
        </span>
      ))}
    </Link>
  );
}

/**
 * El entreno de hoy en grande: lo planificado (con su botón para empezarlo),
 * lo ya hecho o el día de descanso. Sin plan para hoy no sale.
 */
export function TodayWorkoutCard({
  day,
  onStart,
  doneMinutes,
  doneCount = 0,
}: {
  day: PlanDay | null;
  onStart: () => void;
  doneMinutes: number;
  /** Entrenos registrados hoy (puede haber varios: fútbol y gimnasio, p. ej.). */
  doneCount?: number;
}) {
  const planned: PlannedSession | null = day?.planned ?? null;
  if (!day || (!planned && !day.actual)) return null;

  if (day.status === 'DONE' || day.actual) {
    const title = day.actual?.title ?? planned?.title ?? 'Entreno';
    const many = doneCount > 1;
    return (
      <section className="tv-card tv-workout is-done is-stack">
        <Link to={`/tabs/plan/sesion/${day.day}`} className="tv-workout__done">
          <span className="tv-workout__check" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="rk-row__main">
            <span className="tv-workout__kicker">{many ? `${doneCount} entrenos hoy` : 'Entreno de hoy hecho'}</span>
            <span className="tv-workout__title">{title}</span>
            <span className="tv-workout__meta">
              {many
                ? `${doneMinutes} min en total`
                : day.actual
                  ? formatDuration(day.actual.durationSec)
                  : doneMinutes
                    ? `${doneMinutes} min`
                    : 'Buen trabajo'}
            </span>
          </span>
          <Chevron />
        </Link>
        <button type="button" className="tv-workout__another" onClick={onStart}>
          + Añadir otro entreno
        </button>
      </section>
    );
  }

  if (!planned) return null;

  if (planned.load === 'REST') {
    return (
      <Link to={`/tabs/plan/sesion/${day.day}`} className="tv-card tv-workout is-rest">
        <span className="rk-row__main">
          <span className="tv-workout__kicker">Hoy descansas</span>
          <span className="tv-workout__title">{planned.title}</span>
          <span className="tv-workout__meta">Recuperar también es entrenar.</span>
        </span>
        <Chevron />
      </Link>
    );
  }

  const meta = [
    `Carga ${LOAD_LABEL[planned.load].toLowerCase()}`,
    planned.plannedDurationMin ? fmtMinutes(planned.plannedDurationMin) : null,
    planned.plannedDistanceM ? `${(planned.plannedDistanceM / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km` : null,
  ].filter(Boolean);

  return (
    <section className="tv-card tv-workout" aria-labelledby="tv-workout-title">
      <span className="tv-workout__kicker">Hoy entrenas{planned.startTime ? ` · ${planned.startTime}` : ''}</span>
      <span id="tv-workout-title" className="tv-workout__title">
        {planned.title}
      </span>
      <span className="tv-workout__chips">
        {meta.map((m) => (
          <span key={m} className="tv-workout__chip">
            {m}
          </span>
        ))}
      </span>
      <div className="tv-workout__actions">
        <button type="button" className="tv-workout__start" onClick={onStart}>
          {planned.kind === 'STRENGTH' ? 'Empezar entreno' : 'Registrar entreno'}
        </button>
        <Link to={`/tabs/plan/sesion/${day.day}`} className="tv-workout__more">
          Ver sesión
        </Link>
      </div>
    </section>
  );
}
