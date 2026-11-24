import { Link } from 'react-router-dom';
import type { DayTotals } from '../api';
import { formatDuration, formatNumber } from '../format';
import type { PlanDay, PlannedSession } from '../plan/plan.api';
import { LOAD_LABEL, fmtMinutes } from '../plan/plan-labels';
import { Chevron, Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
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
export function WeekStrip({
  days,
  today,
  selected,
  onSelect,
}: {
  days: PlanDay[];
  today: string;
  /** Día que se está viendo; con `onSelect`, la tira sirve para cambiar de día. */
  selected?: string;
  onSelect?: (day: string) => void;
}) {
  const dots = weekDots(days, today);
  if (!dots.length) return null;
  if (onSelect) {
    return (
      <div className="tv-week" role="group" aria-label="Elegir día de la semana">
        {dots.map((d) => (
          <button
            key={d.day}
            type="button"
            className={`tv-week__day tv-week__pick${d.state === 'today' ? ' is-today' : ''}${d.day === selected ? ' is-selected' : ''}`}
            aria-pressed={d.day === selected}
            aria-label={d.label}
            disabled={d.day > today}
            onClick={() => onSelect(d.day)}
          >
            <span className="tv-week__letter">{d.letter}</span>
            <Dot d={d} />
          </button>
        ))}
      </div>
    );
  }
  return (
    <Link to="/tabs/entrenos/plan" className="tv-week" aria-label={`Tu semana. ${dots.map((d) => d.label).join(', ')}. Abrir plan.`}>
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
export interface DoneWorkout {
  id: string;
  name: string;
  kind: string;
  durationSec: number;
  kcal: number;
  /** Para los de fuerza: abre sus series. */
  to?: string;
}

const KIND_ICON: Record<string, string> = {
  STRENGTH: PATHS.strength,
  RUN: PATHS.run,
  CYCLE: PATHS.bike,
  WALK: PATHS.walk,
  HIKE: PATHS.walk,
};

export function TodayWorkoutCard({
  day,
  onStart,
  doneMinutes,
  done = [],
  isToday = true,
}: {
  day: PlanDay | null;
  onStart: () => void;
  doneMinutes: number;
  /** Otro día: los textos hablan de «ese día» y no se ofrece empezar lo planificado. */
  isToday?: boolean;
  /** Entrenos registrados hoy (puede haber varios: fútbol y gimnasio, p. ej.). */
  done?: DoneWorkout[];
}) {
  const planned: PlannedSession | null = day?.planned ?? null;
  // Entrenos sin plan también cuentan (un pádel improvisado, por ejemplo).
  if (!done.length && (!day || (!planned && !day.actual))) return null;

  if (done.length || day?.status === 'DONE' || day?.actual) {
    // Varios entrenos: cada uno en su fila; uno solo: el título grande de siempre.
    if (done.length > 1) {
      const kcal = done.reduce((t, w) => t + w.kcal, 0);
      return (
        <section className="tv-card tv-workout is-done is-stack" aria-labelledby="tv-done">
          <div className="tv-workout__done-head">
            <span id="tv-done" className="tv-workout__kicker">
              {isToday ? 'Hoy has entrenado' : 'Entrenaste'} {done.length} veces
            </span>
            <span className="tv-workout__total">
              {fmtMinutes(doneMinutes)} · {formatNumber(Math.round(kcal))} kcal
            </span>
          </div>
          <ul className="tv-done-list">
            {done.map((w) => {
              const body = (
                <>
                  <span className="tv-done-list__icon" aria-hidden="true">
                    <Icon d={KIND_ICON[w.kind] ?? PATHS.dance} size={18} stroke={2.2} />
                  </span>
                  <span className="tv-done-list__name">{w.name}</span>
                  <span className="tv-done-list__meta">
                    {formatDuration(w.durationSec)} · {formatNumber(Math.round(w.kcal))} kcal
                  </span>
                </>
              );
              return (
                <li key={w.id}>
                  {w.to ? (
                    <Link to={w.to} className="tv-done-list__row">
                      {body}
                    </Link>
                  ) : (
                    <span className="tv-done-list__row">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <button type="button" className="tv-workout__another" onClick={onStart}>
            + Añadir otro entreno
          </button>
        </section>
      );
    }
    const title = done[0]?.name ?? day?.actual?.title ?? planned?.title ?? 'Entreno';
    return (
      <section className="tv-card tv-workout is-done is-stack">
        <Link to={done[0]?.to ?? (day ? `/tabs/entrenos/plan/sesion/${day.day}` : '/tabs/entrenos/plan')} className="tv-workout__done">
          <span className="tv-workout__check" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="rk-row__main">
            <span className="tv-workout__kicker">{isToday ? 'Entreno de hoy hecho' : 'Entreno hecho'}</span>
            <span className="tv-workout__title">{title}</span>
            <span className="tv-workout__meta">
              {done[0]
                ? formatDuration(done[0].durationSec)
                : day?.actual
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

  if (!planned || !day) return null;

  if (planned.load === 'REST') {
    return (
      <Link to={`/tabs/entrenos/plan/sesion/${day.day}`} className="tv-card tv-workout is-rest">
        <span className="rk-row__main">
          <span className="tv-workout__kicker">{isToday ? 'Hoy descansas' : 'Día de descanso'}</span>
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
      <span className="tv-workout__kicker">{isToday ? 'Hoy entrenas' : 'Tocaba entrenar'}{planned.startTime ? ` · ${planned.startTime}` : ''}</span>
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
          {isToday && planned.kind === 'STRENGTH' ? 'Empezar entreno' : 'Registrar entreno'}
        </button>
        <Link to={`/tabs/entrenos/plan/sesion/${day.day}`} className="tv-workout__more">
          Ver sesión
        </Link>
      </div>
    </section>
  );
}
