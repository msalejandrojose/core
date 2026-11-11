import { formatKcal, ratio } from './format';
import type { DayTotals } from './api';

const SIZE = 128;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface KcalRingProps {
  totals: DayTotals;
}

/**
 * Anillo de calorías del día: el dato que la gente abre la app para ver.
 *
 * Muestra las kcal RESTANTES (objetivo − ingeridas + gastadas), no las
 * consumidas: es la cifra con la que se decide qué comer ahora. El anillo se
 * llena con lo consumido sobre el objetivo, y al pasarse cambia a brick en vez
 * de mostrar un error — comer de más un día es un dato, no un fallo.
 *
 * SVG inline en vez de una librería de gráficas: son dos círculos, y meter una
 * dependencia para esto engordaría el bundle de la app sin ganar nada.
 */
export function KcalRing({ totals }: KcalRingProps) {
  const consumed = ratio(totals.kcalIn, totals.kcalTarget);
  const over =
    totals.kcalRemaining !== null && totals.kcalRemaining < 0;
  const offset = CIRCUMFERENCE * (1 - consumed);

  const hasTarget = totals.kcalTarget !== null;
  const number = hasTarget
    ? formatKcal(Math.abs(totals.kcalRemaining ?? 0))
    : formatKcal(totals.kcalIn);
  const caption = hasTarget
    ? over
      ? 'kcal de más'
      : 'kcal restantes'
    : 'kcal de hoy';

  return (
    <div className={`nutre-ring${over ? ' nutre-ring--over' : ''}`}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${number} ${caption}`}
      >
        <circle
          className="nutre-ring__track"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
        />
        <circle
          className="nutre-ring__value"
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="nutre-ring__center" aria-hidden="true">
        <div>
          <div className="nutre-ring__number">{number}</div>
          <div className="nutre-ring__caption">{caption}</div>
        </div>
      </div>
    </div>
  );
}
