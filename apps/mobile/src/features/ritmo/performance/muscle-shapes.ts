/**
 * Dibujo del mapa muscular 2D. Todo está trazado para la mitad izquierda del
 * lienzo (x < 100) y se refleja para la otra; lo que cruza el eje lleva `whole`.
 *
 * La figura de hombre es la dibujada a mano. La de mujer sale de deformar esa
 * misma en anchura según la altura (hombros y cintura más estrechos, cadera más
 * ancha), de modo que las dos comparten los mismos músculos y zonas táctiles.
 * Son ilustraciones simplificadas: enseñan DÓNDE has entrenado, no anatomía.
 */
export type Figure = 'male' | 'female';

export interface Region {
  /** Trazados de la mitad izquierda (o del cuerpo entero si `whole`). */
  d: string[];
  whole?: boolean;
}

export interface FigureShapes {
  head: { cx: number; cy: number; rx: number; ry: number };
  /** Pelo, por detrás de la cabeza (frente) o por encima (espalda); cuerpo entero. */
  hairFront: string | null;
  hairBack: string | null;
  /** Media silueta. */
  body: string;
  front: Record<string, Region>;
  back: Record<string, Region>;
}

/** Media silueta, en dos tramos: cuello, hombro y brazo; y de la axila a los pies. */
const BODY_ARM =
  'M100 38 L92 38 L91 50 C80 54 68 56 60 62 C52 66 48 76 48 88 C46 104 44 118 42 130 ' +
  'C40 144 36 160 33 176 L30 190 C30 198 38 198 39 191 L44 176 C48 160 52 146 54 132 ' +
  'C56 118 58 106 60 96';
const BODY_TRUNK =
  'C62 112 64 128 66 144 C66 156 64 166 62 178 C58 200 58 226 60 250 ' +
  'C62 262 62 272 62 282 C58 300 60 322 64 344 L64 362 L57 372 L75 372 L76 362 ' +
  'C80 340 82 316 80 290 C80 278 82 268 84 258 C90 236 94 212 100 196 Z';

const ARM_UPPER = 'M50 96 C46 106 45 118 46 128 C50 131 54 129 56 124 C58 114 58 104 57 97 C55 93 52 93 50 96 Z';
const FOREARM = 'M43 134 C40 148 37 162 35 174 L43 175 C47 162 51 148 53 136 C50 132 46 132 43 134 Z';
const SHOULDER = 'M64 61 C56 62 50 70 49 81 C56 82 63 78 67 70 C67 66 66 63 64 61 Z';
const SIDE_DELT = 'M49 82 C48 74 51 66 58 62 C52 63 46 70 46 82 C46 88 47 92 48 95 C48 90 48 86 49 82 Z';

/** Lo que cuelga del hombro se mueve con él, no con la cintura ni la cadera. */
const ARM_MUSCLES = new Set(['FRONT_DELT', 'SIDE_DELT', 'REAR_DELT', 'BICEPS', 'TRICEPS', 'FOREARMS']);

const FRONT: Record<string, Region> = {
  CHEST: { d: ['M98 66 C88 62 74 64 67 72 C65 82 70 92 82 94 C90 95 96 92 98 88 Z'] },
  FRONT_DELT: { d: [SHOULDER] },
  SIDE_DELT: { d: [SIDE_DELT] },
  BICEPS: { d: [ARM_UPPER] },
  FOREARMS: { d: [FOREARM] },
  ABS: {
    d: [
      'M88 99 L98 99 L98 112 L88 112 L87 110 L87 101 Z',
      'M87 115 L98 115 L98 128 L87 128 Z',
      'M87 131 L98 131 L98 151 C94 151 89 148 87 142 Z',
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

/** Anchura de la figura de mujer respecto a la de hombre, por altura (y del lienzo). */
const SHOULDER_WIDTH = 0.86;
const FEMALE_PROFILE: [number, number][] = [
  [96, SHOULDER_WIDTH],
  [142, 0.79],
  [180, 1.07],
  [226, 1.07],
  [262, 0.97],
  [300, 0.93],
  [372, 0.93],
];

/** Interpola el perfil de anchura en `y`. */
export function widthAt(y: number, profile: [number, number][] = FEMALE_PROFILE): number {
  if (y <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i += 1) {
    const [y1, w1] = profile[i];
    if (y <= y1) {
      const [y0, w0] = profile[i - 1];
      return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
    }
  }
  return profile[profile.length - 1][1];
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Estrecha o ensancha un trazado (órdenes absolutas M, L, C y Z) alrededor del eje x = 100. */
export function warpPath(d: string, width: (y: number) => number): string {
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, xs: string, ys: string) => {
    const y = Number(ys);
    return `${round(100 + (Number(xs) - 100) * width(y))} ${ys}`;
  });
}

function warpRegions(regions: Record<string, Region>): Record<string, Region> {
  return Object.fromEntries(
    Object.entries(regions).map(([muscle, region]) => [
      muscle,
      { ...region, d: region.d.map((d) => warpPath(d, ARM_MUSCLES.has(muscle) ? () => SHOULDER_WIDTH : widthAt)) },
    ]),
  );
}

const MALE: FigureShapes = {
  head: { cx: 100, cy: 21, rx: 13, ry: 16 },
  hairFront: null,
  hairBack: null,
  body: `${BODY_ARM} ${BODY_TRUNK}`,
  front: FRONT,
  back: BACK,
};

const FEMALE: FigureShapes = {
  head: { cx: 100, cy: 22, rx: 12, ry: 15 },
  // Media melena: por detrás de la cara de frente, y cubriendo la cabeza de espaldas.
  hairFront: 'M100 3 C84 3 82 18 83 30 C83 40 84 47 87 52 L92 44 C89 34 88 22 92 14 C96 10 104 10 108 14 C112 22 111 34 108 44 L113 52 C116 47 117 40 117 30 C118 18 116 3 100 3 Z',
  hairBack: 'M100 3 C84 3 82 18 83 30 C83 40 84 47 87 52 C95 55 105 55 113 52 C116 47 117 40 117 30 C118 18 116 3 100 3 Z',
  body: `${warpPath(BODY_ARM, () => SHOULDER_WIDTH)} ${warpPath(BODY_TRUNK, widthAt)}`,
  front: warpRegions(FRONT),
  back: warpRegions(BACK),
};

export const FIGURES: Record<Figure, FigureShapes> = { male: MALE, female: FEMALE };
