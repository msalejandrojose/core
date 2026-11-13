import { useEffect, useState } from 'react';
import { useRitmoStore } from '../ritmo.store';
import type { AtlasPart, AtlasView, Figure, Side } from './body-atlas';
import { MUSCLE_NAME } from './labels';

/**
 * Mapa muscular: ilustración anatómica del cuerpo de frente y de espalda, en
 * figura de hombre o de mujer, con cada grupo coloreado según su carga de
 * entrenamiento relativa (0–1). Enseña DÓNDE has entrenado, no el estado del
 * músculo. El dibujo (body-atlas) pesa, así que se carga aparte.
 */

type Atlas = Record<Figure, Record<Side, AtlasView>>;

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

/**
 * Una zona puede representar varios músculos (el hombro de frente es deltoides
 * anterior y lateral): se pinta con el más cargado y cada toque pasa al siguiente.
 */
function nextMuscle(muscles: string[], selected: string | null, values: Record<string, number>): string {
  const i = selected ? muscles.indexOf(selected) : -1;
  if (i >= 0) return muscles[(i + 1) % muscles.length];
  return [...muscles].sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))[0];
}

function Zone({ part, values, describe, selected, onSelect }: MuscleMapProps & { part: AtlasPart }) {
  const paths = part.d.map((d, i) => <path key={i} d={d} />);
  if (!part.muscles.length) return <g className={`musclemap__detail musclemap__detail--${part.slug}`}>{paths}</g>;

  const isSelected = !!selected && part.muscles.includes(selected);
  const value = Math.max(...part.muscles.map((m) => values[m] ?? 0));
  const pick = () => {
    const next = nextMuscle(part.muscles, selected, values);
    // Con un solo músculo, tocar de nuevo lo deselecciona (lo decide la pantalla).
    onSelect(next);
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={part.muscles.map((m) => `${MUSCLE_NAME[m]}: ${describe(m)}`).join('. ')}
      className={`musclemap__muscle${isSelected ? ' is-selected' : ''}`}
      style={{ fill: heat(value) }}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      }}
    >
      {paths}
    </g>
  );
}

function View({ title, view, ...props }: MuscleMapProps & { title: string; view: AtlasView }) {
  return (
    <figure className="musclemap__view">
      <svg viewBox={view.viewBox} role="group" aria-label={`Cuerpo, ${title.toLowerCase()}`}>
        <path d={view.outline} className="musclemap__outline" />
        {view.parts.map((part) => (
          <Zone key={part.slug} part={part} {...props} />
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
  const [atlas, setAtlas] = useState<Atlas | null>(null);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  useEffect(() => {
    let alive = true;
    void import('./body-atlas').then((m) => alive && setAtlas(m.ATLAS));
    return () => {
      alive = false;
    };
  }, []);

  const figure: Figure = chosen ?? (profile?.sex === 'FEMALE' ? 'female' : 'male');

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
        {atlas ? (
          <>
            <View title="Frente" view={atlas[figure].front} {...props} />
            <View title="Espalda" view={atlas[figure].back} {...props} />
          </>
        ) : (
          <div className="musclemap__loading" aria-hidden="true" />
        )}
      </div>
      <Legend />
    </div>
  );
}
