import { MUSCLE_NAME } from '../performance/labels';

/** Peso de un músculo: sin trabajar → principal → secundario → indirecto. */
const CYCLE = [0, 1, 0.5, 0.25];
const LEVEL: Record<number, string> = { 1: 'Principal', 0.5: 'Secundario', 0.25: 'Indirecto' };

/** Selector de músculos: cada toque pasa al siguiente nivel de participación. */
export function MusclePicker({
  value,
  onChange,
}: {
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  return (
    <div className="workout__muscles" role="group" aria-label="Músculos que trabaja">
      {Object.keys(MUSCLE_NAME).map((m) => {
        const w = value[m] ?? 0;
        return (
          <button
            key={m}
            type="button"
            className={`workout__muscle${w ? ` is-${w === 1 ? 'main' : w === 0.5 ? 'sec' : 'ind'}` : ''}`}
            aria-label={`${MUSCLE_NAME[m]}: ${w ? LEVEL[w] : 'no lo trabaja'}. Toca para cambiar.`}
            onClick={() => onChange({ ...value, [m]: CYCLE[(CYCLE.indexOf(w) + 1) % CYCLE.length] })}
          >
            {MUSCLE_NAME[m]}
            {w ? <em>{LEVEL[w]}</em> : null}
          </button>
        );
      })}
    </div>
  );
}
