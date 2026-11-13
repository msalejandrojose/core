import { useEffect, useState } from 'react';
import { useRitmoStore } from '../ritmo.store';
import { MUSCLE_NAME } from './labels';
import { FIGURES, type Figure, type FigureShapes, type Region } from './muscle-shapes';

/**
 * Mapa muscular 2D: el cuerpo de frente y de espalda, en figura de hombre o de
 * mujer, con cada grupo coloreado según su carga de entrenamiento relativa
 * (0–1). Enseña DÓNDE has entrenado, no el estado del músculo.
 */

/** Refleja lo dibujado en la mitad izquierda sobre el eje x = 100. */
const MIRROR = 'translate(200 0) scale(-1 1)';

function Silhouette({ shapes, back }: { shapes: FigureShapes; back: boolean }) {
  const hair = back ? shapes.hairBack : shapes.hairFront;
  return (
    <g className="musclemap__body">
      {hair && !back ? <path d={hair} className="musclemap__hair" /> : null}
      <ellipse {...shapes.head} />
      {hair && back ? <path d={hair} className="musclemap__hair" /> : null}
      <path d={shapes.body} />
      <path d={shapes.body} transform={MIRROR} />
    </g>
  );
}

/** Del blanco (sin trabajo) al color de actividad (lo más trabajado). */
function heat(v: number): string {
  return v <= 0
    ? 'var(--ritmo-surface)'
    : `color-mix(in srgb, var(--ritmo-activity) ${Math.round(25 + v * 75)}%, var(--ritmo-surface))`;
}

export interface MuscleMapProps {
  /** Carga relativa por músculo, de 0 a 1. */
  values: Record<string, number>;
  /** Texto de la cifra de cada músculo, para lectores de pantalla. */
  describe: (muscle: string) => string;
  selected: string | null;
  onSelect: (muscle: string) => void;
}

function View({ title, shapes, back, values, describe, selected, onSelect }: MuscleMapProps & { title: string; shapes: FigureShapes; back: boolean }) {
  const regions: Record<string, Region> = back ? shapes.back : shapes.front;
  return (
    <figure className="musclemap__view">
      <svg viewBox="24 0 152 378" role="group" aria-label={`Cuerpo, ${title.toLowerCase()}`}>
        <Silhouette shapes={shapes} back={back} />
        {Object.entries(regions).map(([muscle, region]) => (
          <g
            key={muscle}
            role="button"
            tabIndex={0}
            aria-pressed={selected === muscle}
            aria-label={`${MUSCLE_NAME[muscle]}: ${describe(muscle)}`}
            className={`musclemap__muscle${selected === muscle ? ' is-selected' : ''}`}
            style={{ fill: heat(values[muscle] ?? 0) }}
            onClick={() => onSelect(muscle)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(muscle);
              }
            }}
          >
            {region.d.map((d, i) => (
              <path key={i} d={d} />
            ))}
            {region.whole ? null : (
              <g transform={MIRROR}>
                {region.d.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
            )}
          </g>
        ))}
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

function Legend() {
  return (
    <div className="musclemap__legend" aria-hidden="true">
      <span>Menos</span>
      <span className="musclemap__scale">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <span key={v} style={{ background: heat(v) }} />
        ))}
      </span>
      <span>Más carga</span>
    </div>
  );
}

const FIGURE_KEY = 'ritmo.musclemap.figure';
const FIGURE_LABEL: Record<Figure, string> = { male: 'Hombre', female: 'Mujer' };

function savedFigure(): Figure | null {
  try {
    const v = localStorage.getItem(FIGURE_KEY);
    return v === 'male' || v === 'female' ? v : null;
  } catch {
    return null;
  }
}

/** Mapa muscular de frente y de espalda. La figura sale de tu perfil y se puede cambiar. */
export function MuscleMap(props: MuscleMapProps) {
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const [chosen, setChosen] = useState<Figure | null>(savedFigure);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  const figure: Figure = chosen ?? (profile?.sex === 'FEMALE' ? 'female' : 'male');
  const shapes = FIGURES[figure];

  function choose(next: Figure) {
    setChosen(next);
    try {
      localStorage.setItem(FIGURE_KEY, next);
    } catch {
      /* sin almacenamiento, la elección dura lo que la pantalla */
    }
  }

  return (
    <div className="musclemap">
      <div className="musclemap__modes" role="group" aria-label="Figura">
        {(['male', 'female'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={figure === f} className={figure === f ? 'is-on' : ''} onClick={() => choose(f)}>
            {FIGURE_LABEL[f]}
          </button>
        ))}
      </div>
      <div className="musclemap__views">
        <View title="Frente" shapes={shapes} back={false} {...props} />
        <View title="Espalda" shapes={shapes} back {...props} />
      </div>
      <Legend />
    </div>
  );
}
