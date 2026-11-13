/**
 * Maniquí 3D del mapa muscular, descrito como elipsoides: `p` es el centro y
 * `s` los radios, en metros, con el cuerpo de pie (y hacia arriba, z hacia el
 * frente). Lo que tiene `mirror` se repite en el otro lado (x → −x).
 *
 * Es una figura simplificada: enseña DÓNDE has entrenado, no anatomía real.
 */
export interface Part {
  p: [number, number, number];
  s: [number, number, number];
  mirror?: boolean;
}

/** Cuerpo neutro sobre el que se apoyan los músculos. */
export const BODY_PARTS: Part[] = [
  { p: [0, 1.665, 0.005], s: [0.082, 0.105, 0.092] }, // cabeza
  { p: [0, 1.53, -0.005], s: [0.045, 0.06, 0.045] }, // cuello
  { p: [0, 1.3, 0], s: [0.165, 0.2, 0.09] }, // tórax
  { p: [0, 1.1, 0], s: [0.135, 0.15, 0.08] }, // cintura
  { p: [0, 0.95, 0], s: [0.155, 0.11, 0.092] }, // cadera
  { p: [0.215, 1.42, 0], s: [0.055, 0.06, 0.055], mirror: true }, // hombro
  { p: [0.24, 1.26, 0], s: [0.04, 0.15, 0.042], mirror: true }, // brazo
  { p: [0.255, 1.02, 0.005], s: [0.032, 0.13, 0.034], mirror: true }, // antebrazo
  { p: [0.262, 0.85, 0.01], s: [0.026, 0.055, 0.036], mirror: true }, // mano
  { p: [0.095, 0.68, 0], s: [0.072, 0.22, 0.072], mirror: true }, // muslo
  { p: [0.095, 0.47, 0.005], s: [0.046, 0.055, 0.048], mirror: true }, // rodilla
  { p: [0.095, 0.27, -0.005], s: [0.043, 0.19, 0.045], mirror: true }, // pierna
  { p: [0.095, 0.04, 0.045], s: [0.044, 0.04, 0.105], mirror: true }, // pie
];

/** Elipsoides de cada grupo muscular, algo salientes sobre el cuerpo. */
export const MUSCLE_PARTS: Record<string, Part[]> = {
  CHEST: [{ p: [0.078, 1.365, 0.068], s: [0.085, 0.066, 0.04], mirror: true }],
  ABS: [
    { p: [0.036, 1.215, 0.068], s: [0.034, 0.036, 0.024], mirror: true },
    { p: [0.036, 1.14, 0.066], s: [0.034, 0.036, 0.024], mirror: true },
    { p: [0.035, 1.058, 0.062], s: [0.033, 0.042, 0.024], mirror: true },
  ],
  FRONT_DELT: [{ p: [0.2, 1.43, 0.034], s: [0.046, 0.055, 0.04], mirror: true }],
  SIDE_DELT: [{ p: [0.238, 1.425, 0], s: [0.04, 0.062, 0.044], mirror: true }],
  REAR_DELT: [{ p: [0.2, 1.43, -0.036], s: [0.046, 0.055, 0.04], mirror: true }],
  BICEPS: [{ p: [0.24, 1.27, 0.022], s: [0.036, 0.09, 0.034], mirror: true }],
  TRICEPS: [{ p: [0.243, 1.27, -0.024], s: [0.038, 0.1, 0.034], mirror: true }],
  FOREARMS: [{ p: [0.256, 1.05, 0.004], s: [0.036, 0.095, 0.038], mirror: true }],
  TRAPS: [
    { p: [0.085, 1.485, -0.03], s: [0.085, 0.04, 0.045], mirror: true },
    { p: [0, 1.39, -0.07], s: [0.06, 0.11, 0.03] },
  ],
  LATS: [{ p: [0.105, 1.24, -0.058], s: [0.07, 0.125, 0.04], mirror: true }],
  LOWER_BACK: [{ p: [0.04, 1.07, -0.058], s: [0.038, 0.075, 0.03], mirror: true }],
  GLUTES: [{ p: [0.08, 0.92, -0.062], s: [0.08, 0.078, 0.06], mirror: true }],
  QUADS: [{ p: [0.095, 0.69, 0.032], s: [0.066, 0.185, 0.052], mirror: true }],
  HAMSTRINGS: [{ p: [0.095, 0.68, -0.036], s: [0.062, 0.17, 0.05], mirror: true }],
  CALVES: [{ p: [0.096, 0.31, -0.03], s: [0.042, 0.115, 0.04], mirror: true }],
};

/** Los elipsoides de una lista, con los reflejados ya desdoblados. */
export function expand(parts: Part[]): Part[] {
  return parts.flatMap((part) =>
    part.mirror ? [part, { p: [-part.p[0], part.p[1], part.p[2]] as Part['p'], s: part.s }] : [part],
  );
}

/** Mezcla lineal de dos colores RGB (0–255) para `t` entre 0 y 1. */
export function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, t));
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as [number, number, number];
}

/** Misma escala que el mapa 2D: sin trabajo, superficie; con trabajo, del 25 % al 100 % del color. */
export function heatRgb(v: number, surface: [number, number, number], activity: [number, number, number]): [number, number, number] {
  return v <= 0 ? surface : mixRgb(surface, activity, 0.25 + Math.min(1, v) * 0.75);
}
