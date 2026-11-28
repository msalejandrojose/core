import { shiftDay, weekRange } from './plan-labels';

/**
 * «‹ Semana 48 · 23–29 nov ›»: cambia de semana. Tocar el centro vuelve a la
 * semana actual. `onChange(undefined)` = semana actual; si no, un día de la semana pedida.
 */
export function WeekNav({
  from,
  to,
  today,
  isoWeek,
  onChange,
}: {
  from: string;
  to: string;
  today: string;
  isoWeek?: number;
  onChange: (day: string | undefined) => void;
}) {
  const isThisWeek = today >= from && today <= to;
  return (
    <div className="plan__weeknav">
      <button type="button" aria-label="Semana anterior" className="rk-iconbtn" onClick={() => onChange(shiftDay(from, -7))}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <button type="button" className="plan__weeknav-label" disabled={isThisWeek} onClick={() => onChange(undefined)}>
        <span>
          {isoWeek ? `Semana ${isoWeek} · ` : ''}
          {weekRange(from, to)}
        </span>
        {!isThisWeek ? <span className="plan__weeknav-back">Volver a esta semana</span> : null}
      </button>
      <button type="button" aria-label="Semana siguiente" className="rk-iconbtn" onClick={() => onChange(shiftDay(from, 7))}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
