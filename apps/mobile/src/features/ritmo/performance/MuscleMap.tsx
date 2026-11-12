import { MUSCLE_NAME } from './labels';

/**
 * Mapa muscular 2D: el cuerpo de frente y de espalda, con cada grupo coloreado
 * según su carga de entrenamiento relativa (0–1). Es un esquema, no un atlas:
 * enseña DÓNDE has entrenado, no el estado del músculo.
 */

type Shape =
  | { t: 'e'; cx: number; cy: number; rx: number; ry: number }
  | { t: 'r'; x: number; y: number; w: number; h: number; r: number }
  | { t: 'p'; points: string };

/** Elipse en un lado y su simétrica (el cuerpo está centrado en x = 100). */
const pair = (cx: number, cy: number, rx: number, ry: number): Shape[] => [
  { t: 'e', cx, cy, rx, ry },
  { t: 'e', cx: 200 - cx, cy, rx, ry },
];

const FRONT: Record<string, Shape[]> = {
  FRONT_DELT: pair(64, 66, 10, 9),
  SIDE_DELT: pair(51, 73, 7, 11),
  CHEST: pair(84, 83, 15, 12),
  BICEPS: pair(48, 102, 9, 18),
  FOREARMS: pair(40, 152, 8, 22),
  ABS: [{ t: 'r', x: 86, y: 99, w: 28, h: 54, r: 9 }],
  QUADS: pair(82, 222, 15, 38),
  CALVES: pair(80, 302, 9, 27),
};

const BACK: Record<string, Shape[]> = {
  TRAPS: [{ t: 'p', points: '100,44 124,62 100,102 76,62' }],
  REAR_DELT: pair(58, 68, 11, 10),
  LATS: pair(79, 110, 13, 24),
  TRICEPS: pair(48, 102, 9, 18),
  FOREARMS: pair(40, 152, 8, 22),
  LOWER_BACK: [{ t: 'r', x: 86, y: 130, w: 28, h: 26, r: 9 }],
  GLUTES: pair(86, 178, 15, 14),
  HAMSTRINGS: pair(82, 230, 15, 31),
  CALVES: pair(80, 302, 11, 28),
};

/** Silueta: cabeza, cuello, tronco, brazos y piernas, en gris neutro. */
function Silhouette() {
  return (
    <g className="musclemap__body">
      <circle cx="100" cy="24" r="16" />
      <rect x="92" y="38" width="16" height="14" rx="5" />
      <path d="M58 56 Q100 46 142 56 L134 150 Q132 178 136 196 L64 196 Q68 178 66 150 Z" />
      <ellipse cx="48" cy="96" rx="12" ry="32" />
      <ellipse cx="152" cy="96" rx="12" ry="32" />
      <ellipse cx="40" cy="152" rx="10" ry="27" />
      <ellipse cx="160" cy="152" rx="10" ry="27" />
      <ellipse cx="82" cy="226" rx="18" ry="44" />
      <ellipse cx="118" cy="226" rx="18" ry="44" />
      <ellipse cx="80" cy="302" rx="13" ry="36" />
      <ellipse cx="120" cy="302" rx="13" ry="36" />
    </g>
  );
}

function draw(shape: Shape, key: number) {
  if (shape.t === 'e') return <ellipse key={key} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
  if (shape.t === 'r') return <rect key={key} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} />;
  return <polygon key={key} points={shape.points} />;
}

/** Del gris (sin trabajo) al color de actividad (lo más trabajado). */
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

function View({ title, regions, values, describe, selected, onSelect }: MuscleMapProps & { title: string; regions: Record<string, Shape[]> }) {
  return (
    <figure className="musclemap__view">
      <svg viewBox="20 0 160 344" role="group" aria-label={`Cuerpo, ${title.toLowerCase()}`}>
        <Silhouette />
        {Object.entries(regions).map(([muscle, shapes]) => (
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
            {shapes.map(draw)}
          </g>
        ))}
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

export function MuscleMap(props: MuscleMapProps) {
  return (
    <div className="musclemap">
      <div className="musclemap__views">
        <View title="Frente" regions={FRONT} {...props} />
        <View title="Espalda" regions={BACK} {...props} />
      </div>
      <div className="musclemap__legend" aria-hidden="true">
        <span>Menos</span>
        <span className="musclemap__scale">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <span key={v} style={{ background: heat(v) }} />
          ))}
        </span>
        <span>Más carga</span>
      </div>
    </div>
  );
}
