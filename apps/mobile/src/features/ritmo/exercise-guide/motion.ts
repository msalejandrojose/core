// Motor de las animaciones de ejercicios: una figura de palitos que va de una
// pose a otra. Cada ejercicio se describe con dos poses (inicio y final del
// movimiento) y el motor interpola entre ellas. Las coordenadas son las del
// viewBox de la animación (ver VIEWBOX); el suelo está en y = GROUND.
//
// Ángulos en grados, en coordenadas de pantalla: 0 = derecha, 90 = abajo,
// -90 = arriba. En la vista de perfil la figura mira a la derecha.

export type Vec = [number, number];

/** Longitudes de los segmentos del cuerpo. */
export const BODY = {
  torso: 46,
  neck: 5,
  headR: 8,
  upperArm: 26,
  forearm: 24,
  thigh: 37,
  shin: 35,
  foot: 11,
  hand: 7,
  /** Media anchura de hombros y de cadera en la vista de frente. */
  shoulderW: 13,
  hipW: 7,
} as const;

export const GROUND = 166;
export const VIEWBOX = '0 -22 200 198';

/**
 * Un brazo o una pierna. Por ángulos de sus dos segmentos, o por la posición
 * de la mano o el tobillo (el codo o la rodilla se calculan solos).
 */
export type Limb =
  | {
      /** Ángulo del segmento de arriba (brazo, muslo). */
      a: number;
      /** Ángulo del de abajo (antebrazo, espinilla). */
      b: number;
      /**
       * Ángulos relativos al tronco: 0 = a lo largo del tronco hacia la cadera.
       * Sirve para brazos que acompañan al tronco (barra a la espalda).
       */
      rel?: boolean;
      /** Factor de longitud del segmento de arriba (escorzo en la vista de frente). */
      k?: number;
    }
  | {
      /** Dónde está la mano o el tobillo. */
      to: Vec;
      /**
       * Hacia qué lado se dobla el codo o la rodilla: 1 en el sentido de las
       * agujas del reloj respecto a la línea hombro–mano, -1 al contrario.
       * Valores intermedios lo dejan más estirado.
       */
      bend: number;
      /** `to` es relativo a este punto en lugar de absoluto. */
      from?: 'shoulder' | 'hip';
      /** Con `from`, `to` va en ejes del tronco: [hacia la cabeza, hacia la espalda]. */
      frame?: boolean;
    };

export interface Pose {
  /** Posición de la cadera (centro en la vista de frente). */
  hip: Vec;
  /** Ángulo cadera → hombros. */
  torso: number;
  /** Ángulo hombros → cabeza; por defecto, el del tronco. */
  head?: number;
  /** Factor de longitud del tronco (escorzo: inclinado visto de frente). */
  tl?: number;
  /** Cuánto suben los hombros sobre el tronco (encogimientos). */
  shrug?: number;
  /** En la vista de frente, si solo hay uno, el otro se dibuja en espejo. */
  arms: Limb[];
  legs: Limb[];
  /** Ángulo de cada pie (tobillo → punta). Por defecto, 0 (hacia delante). */
  feet?: number[];
  /** Ángulo de la mano del primer brazo, si se mueve la muñeca. */
  wrist?: number;
}

export type Joint = 'hand' | 'hand2' | 'wrist' | 'elbow' | 'shoulder' | 'hip' | 'knee' | 'ankle' | 'toe';

export type Prop =
  /** Elementos fijos: banco, barra de dominadas, suelo de una máquina… */
  | { kind: 'line'; from: Vec; to: Vec; w?: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'disc'; at: Vec; r: number }
  /**
   * Disco de barra visto de lado. `off` va en ejes del tronco y `shift` en
   * coordenadas de pantalla (igual en la almohadilla y el rodillo).
   */
  | { kind: 'plate'; at: Joint; off?: Vec; shift?: Vec; r?: number }
  | { kind: 'dumbbell'; at: Joint; vertical?: boolean; both?: boolean }
  /** Cable de polea desde un punto fijo hasta la mano. */
  | { kind: 'cable'; from: Vec; to: Joint | 'bar' }
  /** Barra entre las dos manos (vista de frente). */
  | { kind: 'bar' }
  /** Almohadilla o plataforma pegada a una articulación. */
  | { kind: 'pad'; at: Joint; off?: Vec; shift?: Vec; w: number; h: number; angle: number }
  | { kind: 'roller'; at: Joint; off?: Vec; shift?: Vec; r?: number };

export interface Motion {
  view?: 'side' | 'front';
  a: Pose;
  b: Pose;
  /** Pose a mitad de recorrido, si el camino no es recto (un salto). */
  mid?: Pose;
  props?: Prop[];
  /** Si se dibuja el suelo (no en ejercicios colgado). */
  ground?: boolean;
  /** Duración de un ciclo completo, en ms. */
  ms?: number;
}

export interface LimbFrame {
  root: Vec;
  mid: Vec;
  end: Vec;
  tip: Vec | null;
}

export interface Frame {
  hip: Vec;
  shoulder: Vec;
  head: Vec;
  /** En la vista de frente, los dos extremos de hombros y cadera. */
  shoulders: [Vec, Vec] | null;
  hips: [Vec, Vec] | null;
  arms: LimbFrame[];
  legs: LimbFrame[];
  torso: number;
}

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number): Vec => [Math.cos(rad(d)), Math.sin(rad(d))];
const add = (p: Vec, v: Vec, s = 1): Vec => [p[0] + v[0] * s, p[1] + v[1] * s];
const sub = (p: Vec, q: Vec): Vec => [p[0] - q[0], p[1] - q[1]];
const len = (v: Vec) => Math.hypot(v[0], v[1]);
const angleOf = (v: Vec) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;

/** Codo o rodilla para llegar de `root` a `target` con dos segmentos. */
function solve(root: Vec, target: Vec, l1: number, l2: number, bend: number): { mid: Vec; end: Vec } {
  const v = sub(target, root);
  const base = angleOf(v);
  const d = Math.min(Math.max(len(v), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const alpha = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
  const mid = add(root, dir(base + alpha * bend), l1);
  // Si el objetivo no se alcanza, la mano se queda donde llega el brazo.
  const end = add(mid, dir(angleOf(sub(target, mid))), l2);
  return { mid, end };
}

/** Refleja un punto respecto al eje del tronco (vista de frente). */
function reflect(p: Vec, origin: Vec, axis: number): Vec {
  const u = dir(axis);
  const v = sub(p, origin);
  const along = v[0] * u[0] + v[1] * u[1];
  const proj: Vec = [u[0] * along, u[1] * along];
  return add(origin, sub(proj, sub(v, proj)));
}

function mirrorLimb(limb: Limb, origin: Vec, axis: number): Limb {
  if ('to' in limb) {
    if (limb.from) {
      const to: Vec = limb.frame ? [limb.to[0], -limb.to[1]] : reflect(limb.to, [0, 0], axis);
      return { ...limb, to, bend: -limb.bend };
    }
    return { ...limb, to: reflect(limb.to, origin, axis), bend: -limb.bend };
  }
  if (limb.rel) return { ...limb, a: -limb.a, b: -limb.b };
  return { ...limb, a: 2 * axis - limb.a, b: 2 * axis - limb.b };
}

/** Posición de cada articulación para una pose. */
export function solvePose(pose: Pose, view: 'side' | 'front' = 'side'): Frame {
  const front = view === 'front';
  const torsoDir = dir(pose.torso);
  const shoulder = add(pose.hip, torsoDir, BODY.torso * (pose.tl ?? 1));
  const head = add(shoulder, dir(pose.head ?? pose.torso), BODY.neck + BODY.headR);
  const perp = dir(pose.torso + 90);
  const back = dir(pose.torso - 90);
  const lift: Vec = [torsoDir[0] * (pose.shrug ?? 0), torsoDir[1] * (pose.shrug ?? 0)];

  const shoulderPts: [Vec, Vec] = [
    add(add(shoulder, perp, BODY.shoulderW), lift),
    add(add(shoulder, perp, -BODY.shoulderW), lift),
  ];
  const hipPts: [Vec, Vec] = [add(pose.hip, perp, BODY.hipW), add(pose.hip, perp, -BODY.hipW)];

  const withMirror = (limbs: Limb[], origin: Vec) =>
    front && limbs.length === 1 ? [limbs[0], mirrorLimb(limbs[0], origin, pose.torso)] : limbs;

  const limbFrame = (
    limb: Limb,
    root: Vec,
    l1: number,
    l2: number,
    tipAngle: number | undefined,
    tipLen: number,
  ): LimbFrame => {
    let mid: Vec;
    let end: Vec;
    if ('to' in limb) {
      let target = limb.to;
      if (limb.from) {
        const base = limb.from === 'shoulder' ? shoulder : pose.hip;
        target = limb.frame
          ? add(add(base, torsoDir, limb.to[0]), back, limb.to[1])
          : add(base, limb.to);
      }
      ({ mid, end } = solve(root, target, l1, l2, limb.bend));
    } else {
      const offset = limb.rel ? pose.torso + 180 : 0;
      mid = add(root, dir(limb.a + offset), l1 * (limb.k ?? 1));
      end = add(mid, dir(limb.b + offset), l2);
    }
    const tip = tipAngle === undefined ? null : add(end, dir(tipAngle), tipLen);
    return { root, mid, end, tip };
  };

  const arms = withMirror(pose.arms, shoulder).map((limb, i) =>
    limbFrame(
      limb,
      front ? shoulderPts[i % 2] : add(shoulder, lift),
      BODY.upperArm,
      BODY.forearm,
      i === 0 ? pose.wrist : undefined,
      BODY.hand,
    ),
  );
  const legs = withMirror(pose.legs, pose.hip).map((limb, i) => {
    let foot = pose.feet?.[i] ?? pose.feet?.[0] ?? 0;
    if (front && pose.legs.length === 1 && i === 1) foot = 2 * pose.torso - foot;
    return limbFrame(limb, front ? hipPts[i % 2] : pose.hip, BODY.thigh, BODY.shin, foot, front ? BODY.foot * 0.6 : BODY.foot);
  });

  return {
    hip: pose.hip,
    shoulder,
    head,
    shoulders: front ? shoulderPts : null,
    hips: front ? hipPts : null,
    arms,
    legs,
    torso: pose.torso,
  };
}

const lerp = (x: number, y: number, t: number) => x + (y - x) * t;
/** Interpola ángulos por el camino corto (de 170° a -170° pasa por 180°, no por 0°). */
const lerpAngle = (x: number, y: number, t: number) => x + ((((y - x) % 360) + 540) % 360 - 180) * t;
const lerpVec = (p: Vec, q: Vec, t: number): Vec => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const lerpOpt = (x: number | undefined, y: number | undefined, t: number, dflt: number, f = lerp) =>
  x === undefined && y === undefined ? undefined : f(x ?? dflt, y ?? dflt, t);

function lerpLimb(p: Limb, q: Limb, t: number): Limb {
  if ('to' in p && 'to' in q) return { ...p, to: lerpVec(p.to, q.to, t), bend: lerp(p.bend, q.bend, t) };
  if (!('to' in p) && !('to' in q)) {
    return { ...p, a: lerpAngle(p.a, q.a, t), b: lerpAngle(p.b, q.b, t), k: lerpOpt(p.k, q.k, t, 1) };
  }
  return t < 0.5 ? p : q;
}

/** Pose intermedia entre `a` y `b` (t de 0 a 1). */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: lerpVec(a.hip, b.hip, t),
    torso: lerpAngle(a.torso, b.torso, t),
    head: lerpOpt(a.head ?? a.torso, b.head ?? b.torso, t, 0, lerpAngle),
    tl: lerpOpt(a.tl, b.tl, t, 1),
    shrug: lerpOpt(a.shrug, b.shrug, t, 0),
    arms: a.arms.map((l, i) => lerpLimb(l, b.arms[i] ?? l, t)),
    legs: a.legs.map((l, i) => lerpLimb(l, b.legs[i] ?? l, t)),
    feet: a.feet || b.feet ? (a.feet ?? b.feet ?? []).map((_, i) => lerpAngle(a.feet?.[i] ?? 0, b.feet?.[i] ?? 0, t)) : undefined,
    wrist: lerpOpt(a.wrist, b.wrist, t, 0, lerpAngle),
  };
}

/** Pose del ejercicio en un punto del recorrido (0 = inicio, 1 = final). */
export function poseAt(motion: Motion, t: number): Pose {
  if (!motion.mid) return lerpPose(motion.a, motion.b, t);
  return t < 0.5 ? lerpPose(motion.a, motion.mid, t * 2) : lerpPose(motion.mid, motion.b, t * 2 - 1);
}

const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

/**
 * Avance del movimiento (0 = inicio, 1 = final) en un punto del ciclo (0 a 1):
 * pausa en el inicio, ida, pausa al final, vuelta.
 */
export function phase(cycle: number): number {
  const c = ((cycle % 1) + 1) % 1;
  if (c < 0.12) return 0;
  if (c < 0.5) return ease((c - 0.12) / 0.38);
  if (c < 0.62) return 1;
  return 1 - ease((c - 0.62) / 0.38);
}

/** Punto de una articulación del fotograma, para colgar el material. */
export function jointOf(frame: Frame, joint: Joint): Vec {
  const arm = frame.arms[0];
  const leg = frame.legs[0];
  switch (joint) {
    case 'hand':
      return arm.end;
    case 'hand2':
      return (frame.arms[1] ?? arm).end;
    case 'wrist':
      return arm.tip ?? arm.end;
    case 'elbow':
      return arm.mid;
    case 'shoulder':
      return frame.shoulder;
    case 'hip':
      return frame.hip;
    case 'knee':
      return leg.mid;
    case 'ankle':
      return leg.end;
    case 'toe':
      return leg.tip ?? leg.end;
  }
}

/** Desplazamiento en ejes del tronco: [hacia la cabeza, hacia la espalda]. */
export function torsoOffset(frame: Frame, at: Vec, off: Vec | undefined, shift?: Vec): Vec {
  const p = off ? add(add(at, dir(frame.torso), off[0]), dir(frame.torso - 90), off[1]) : at;
  return shift ? add(p, shift) : p;
}
