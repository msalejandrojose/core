import { MUSCLE_NAME } from './labels';

/**
 * Mapa muscular 2D: el cuerpo de frente y de espalda, con cada grupo coloreado
 * según su carga de entrenamiento relativa (0–1). Es una ilustración
 * anatómica simplificada: enseña DÓNDE has entrenado, no el estado del músculo.
 *
 * Todo está dibujado para la mitad izquierda del cuerpo (x < 100) y se
 * refleja para la derecha; lo que cruza el eje lleva `whole`.
 */

interface Region {
  /** Trazados de la mitad izquierda (o del cuerpo entero si `whole`). */
  d: string[];
  whole?: boolean;
}

/** Media silueta: cuello, hombro, brazo, costado, cadera, pierna y pie. */
const HALF_BODY =
  'M100 38 L92 38 L91 50 C80 54 68 56 60 62 C52 66 48 76 48 88 C46 104 44 118 42 130 ' +
  'C40 144 36 160 33 176 L30 190 C30 198 38 198 39 191 L44 176 C48 160 52 146 54 132 ' +
  'C56 118 58 106 60 96 C62 112 64 128 66 144 C66 156 64 166 62 178 C58 200 58 226 60 250 ' +
  'C62 262 62 272 62 282 C58 300 60 322 64 344 L64 362 L57 372 L75 372 L76 362 ' +
  'C80 340 82 316 80 290 C80 278 82 268 84 258 C90 236 94 212 100 196 Z';

const ARM_UPPER = 'M50 96 C46 106 45 118 46 128 C50 131 54 129 56 124 C58 114 58 104 57 97 C55 93 52 93 50 96 Z';
const FOREARM = 'M43 134 C40 148 37 162 35 174 L43 175 C47 162 51 148 53 136 C50 132 46 132 43 134 Z';
const SHOULDER = 'M64 61 C56 62 50 70 49 81 C56 82 63 78 67 70 C67 66 66 63 64 61 Z';

const FRONT: Record<string, Region> = {
  CHEST: { d: ['M98 66 C88 62 74 64 67 72 C65 82 70 92 82 94 C90 95 96 92 98 88 Z'] },
  FRONT_DELT: { d: [SHOULDER] },
  SIDE_DELT: { d: ['M49 82 C48 74 51 66 58 62 C52 63 46 70 46 82 C46 88 47 92 48 95 C48 90 48 86 49 82 Z'] },
  BICEPS: { d: [ARM_UPPER] },
  FOREARMS: { d: [FOREARM] },
  ABS: {
    d: [
      'M88 99 h10 v13 h-10 a3 3 0 0 1 -1 -2 v-9 a3 3 0 0 1 1 -2 Z',
      'M87 115 h11 v13 h-11 Z',
      'M87 131 h11 v20 C94 151 89 148 87 142 Z',
    ],
  },
  QUADS: { d: ['M64 186 C60 206 60 232 63 252 C68 259 78 259 83 252 C89 232 94 210 97 198 C88 190 74 186 64 186 Z'] },
  CALVES: { d: ['M63 290 C61 306 62 324 65 340 L74 340 C78 322 80 304 79 290 C74 285 68 285 63 290 Z'] },
};

const BACK: Record<string, Region> = {
  TRAPS: {
    whole: true,
    d: ['M100 42 C94 52 76 58 65 62 C78 68 92 80 100 106 C108 80 122 68 135 62 C124 58 106 52 100 42 Z'],
  },
  REAR_DELT: { d: [SHOULDER] },
  LATS: { d: ['M66 78 C64 96 66 118 72 138 C80 142 90 136 97 124 C97 110 92 92 84 82 C78 78 72 76 66 78 Z'] },
  TRICEPS: { d: [ARM_UPPER] },
  FOREARMS: { d: [FOREARM] },
  LOWER_BACK: { d: ['M88 128 C86 138 86 148 88 157 L99 157 L99 124 C95 124 91 125 88 128 Z'] },
  GLUTES: { d: ['M64 162 C60 174 62 188 70 194 C82 198 94 194 99 186 L99 163 C88 158 74 158 64 162 Z'] },
  HAMSTRINGS: { d: ['M63 200 C60 220 60 240 63 256 C70 262 78 262 84 256 C90 238 95 218 98 204 C88 199 74 198 63 200 Z'] },
  CALVES: { d: ['M62 288 C58 304 60 324 65 342 L75 342 C80 322 82 304 80 288 C74 281 68 281 62 288 Z'] },
};

/** Refleja lo dibujado en la mitad izquierda sobre el eje x = 100. */
const MIRROR = 'translate(200 0) scale(-1 1)';

function Silhouette() {
  return (
    <g className="musclemap__body">
      <ellipse cx="100" cy="21" rx="13" ry="16" />
      <path d={HALF_BODY} />
      <path d={HALF_BODY} transform={MIRROR} />
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

function View({ title, regions, values, describe, selected, onSelect }: MuscleMapProps & { title: string; regions: Record<string, Region> }) {
  return (
    <figure className="musclemap__view">
      <svg viewBox="24 0 152 378" role="group" aria-label={`Cuerpo, ${title.toLowerCase()}`}>
        <Silhouette />
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
