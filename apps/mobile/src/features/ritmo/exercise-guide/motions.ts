// Cómo se mueve cada ejercicio del catálogo (por `code`). Dos poses por
// ejercicio: `a` es la posición de inicio y `b` el final del recorrido.
// Coordenadas y convenciones en ./motion.ts.
import type { Limb, Motion, Pose, Prop, Vec } from './motion';

const to = (x: number, y: number, bend = 1): Limb => ({ to: [x, y], bend });
const ang = (a: number, b: number): Limb => ({ a, b });
/** Mano o pie relativo al hombro o la cadera, en ejes del tronco. */
const rel = (from: 'shoulder' | 'hip', along: number, backward: number, bend = 1): Limb => ({
  to: [along, backward],
  from,
  frame: true,
  bend,
});
/** Ángulos relativos al tronco (0 = pegado al tronco, hacia la cadera). */
const relAng = (a: number, b: number): Limb => ({ a, b, rel: true });

/** De pie, de perfil, con los pies en (x, suelo). */
const STAND_HIP: Vec = [100, 94];
const standLegs = (x = 102): Limb[] => [to(x, 166, -1)];
const stand = (arms: Limb[], over: Partial<Pose> = {}): Pose => ({
  hip: STAND_HIP,
  torso: -90,
  arms,
  legs: standLegs(),
  ...over,
});
/** De pie, de frente. */
const standFront = (arms: Limb[], over: Partial<Pose> = {}): Pose => ({
  hip: [100, 94],
  torso: -90,
  arms,
  legs: [ang(87, 90)],
  feet: [10],
  ...over,
});

// Material reutilizable.
const flatBench: Prop[] = [
  { kind: 'rect', x: 55, y: 119, w: 95, h: 7 },
  { kind: 'line', from: [66, 126], to: [66, 166], w: 4 },
  { kind: 'line', from: [140, 126], to: [140, 166], w: 4 },
];
/** Barra a la espalda, sobre los trapecios. */
const backBar: Prop = { kind: 'plate', at: 'shoulder', off: [-3, 7] };
/** Brazos sujetando la barra a la espalda. */
const backBarArms = [relAng(40, -150)];

/** Curl: el codo se queda pegado al costado y solo gira el antebrazo. */
const curlDown = [ang(93, 88)];
const curlUp = [ang(95, -72)];
/** Manos cruzadas sobre el pecho. */
const handsOnChest = [relAng(-30, 150)];

/** Tumbado boca arriba en el banco plano, cabeza a la izquierda. */
const supine = (arms: Limb[]): Pose => ({
  hip: [130, 113],
  torso: 180,
  arms,
  legs: [to(160, 165, -1)],
});

export const MOTIONS: Record<string, Motion> = {
  // ── Empuje ─────────────────────────────────────────────────────────────
  bench_press: {
    a: supine([to(84, 64)]),
    b: supine([to(105, 96)]),
    props: [...flatBench, { kind: 'plate', at: 'hand' }],
  },
  incline_bench_press: {
    a: { hip: [120, 117], torso: -145, arms: [to(80, 43)], legs: [to(150, 165, -1)] },
    b: { hip: [120, 117], torso: -145, arms: [to(100, 80)], legs: [to(150, 165, -1)] },
    props: [
      { kind: 'line', from: [118, 124], to: [66, 87], w: 7 },
      { kind: 'line', from: [110, 124], to: [142, 124], w: 7 },
      { kind: 'line', from: [126, 126], to: [126, 166], w: 4 },
      { kind: 'line', from: [84, 102], to: [96, 166], w: 4 },
      { kind: 'plate', at: 'hand' },
    ],
  },
  dumbbell_bench_press: {
    a: supine([to(84, 64)]),
    b: supine([to(104, 100)]),
    props: [...flatBench, { kind: 'dumbbell', at: 'hand' }],
  },
  chest_fly: {
    view: 'front',
    a: standFront([to(158, 50, -0.6)]),
    b: standFront([to(106, 92, -0.6)]),
    props: [
      { kind: 'cable', from: [192, 4], to: 'hand' },
      { kind: 'cable', from: [8, 4], to: 'hand2' },
      { kind: 'roller', at: 'hand', r: 3 },
      { kind: 'line', from: [192, -4], to: [192, 166], w: 4 },
      { kind: 'line', from: [8, -4], to: [8, 166], w: 4 },
    ],
  },
  push_up: {
    a: { hip: [107, 132.7], torso: -21.4, arms: [to(150, 166)], legs: [to(40, 159, 0)], feet: [40] },
    b: { hip: [111.7, 152.4], torso: -5.3, arms: [to(150, 166)], legs: [to(40, 159, 0)], feet: [40] },
  },
  dip: {
    a: { hip: [92, 85.3], torso: -80, arms: [to(106, 88)], legs: [ang(100, 190)], feet: [100] },
    b: { hip: [88.3, 107.2], torso: -70, arms: [to(106, 88)], legs: [ang(98, 195)], feet: [105] },
    props: [
      { kind: 'line', from: [90, 93], to: [130, 93], w: 5 },
      { kind: 'line', from: [126, 93], to: [126, 166], w: 4 },
    ],
  },
  overhead_press: {
    a: stand([to(112, 54)]),
    b: stand([to(101, -1)]),
    props: [{ kind: 'plate', at: 'hand' }],
  },
  dumbbell_shoulder_press: {
    view: 'front',
    a: standFront([to(128, 40)]),
    b: standFront([to(118, -1)]),
    props: [{ kind: 'dumbbell', at: 'hand', both: true }],
  },
  lateral_raise: {
    view: 'front',
    a: standFront([to(121, 96, -1)]),
    b: standFront([to(160, 54, -1)]),
    props: [{ kind: 'dumbbell', at: 'hand', both: true, vertical: true }],
  },
  triceps_pushdown: {
    a: stand([to(124, 62)], { torso: -84 }),
    b: stand([to(110, 97)], { torso: -84 }),
    props: [
      { kind: 'cable', from: [158, -8], to: 'hand' },
      { kind: 'line', from: [166, -16], to: [166, 166], w: 5 },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  skull_crusher: {
    a: supine([to(80, 64)]),
    b: supine([to(63, 97)]),
    props: [...flatBench, { kind: 'plate', at: 'hand', r: 8 }],
  },

  // ── Tirón ──────────────────────────────────────────────────────────────
  pull_up: {
    view: 'front',
    ground: false,
    a: { hip: [100, 104], torso: -90, arms: [to(140, 14)], legs: [ang(91, 92)], feet: [30] },
    b: { hip: [100, 68], torso: -90, arms: [to(140, 14)], legs: [ang(91, 92)], feet: [30] },
    props: [
      { kind: 'line', from: [40, 12], to: [160, 12], w: 5 },
      { kind: 'line', from: [44, 12], to: [44, -20], w: 4 },
      { kind: 'line', from: [156, 12], to: [156, -20], w: 4 },
    ],
  },
  lat_pulldown: {
    view: 'front',
    a: { hip: [100, 124], torso: -90, arms: [to(140, 32)], legs: [{ a: 60, b: 92, k: 0.35 }], feet: [20] },
    b: { hip: [100, 124], torso: -90, arms: [to(140, 68)], legs: [{ a: 60, b: 92, k: 0.35 }], feet: [20] },
    props: [
      { kind: 'rect', x: 76, y: 128, w: 48, h: 7 },
      { kind: 'line', from: [100, 135], to: [100, 166], w: 4 },
      { kind: 'bar' },
      { kind: 'cable', from: [100, -22], to: 'bar' },
    ],
  },
  barbell_row: {
    a: { hip: [90, 98], torso: -25, arms: [to(132, 128)], legs: [to(104, 166, -1)] },
    b: { hip: [90, 98], torso: -25, arms: [to(118, 102)], legs: [to(104, 166, -1)] },
    props: [{ kind: 'plate', at: 'hand' }],
  },
  dumbbell_row: {
    a: {
      hip: [80, 96],
      torso: -5,
      arms: [to(127, 142), to(130, 128, 1)],
      legs: [to(100, 166, -1), ang(90, 180)],
      feet: [0, 180],
    },
    b: {
      hip: [80, 96],
      torso: -5,
      arms: [to(108, 104), to(130, 128, 1)],
      legs: [to(100, 166, -1), ang(90, 180)],
      feet: [0, 180],
    },
    props: [
      { kind: 'rect', x: 28, y: 131, w: 108, h: 7 },
      { kind: 'line', from: [36, 138], to: [36, 166], w: 4 },
      { kind: 'line', from: [128, 138], to: [128, 166], w: 4 },
      { kind: 'dumbbell', at: 'hand' },
    ],
  },
  seated_cable_row: {
    a: { hip: [70, 140], torso: -80, arms: [to(120, 106)], legs: [to(135, 152, -1)], feet: [-70] },
    b: { hip: [70, 140], torso: -95, arms: [to(86, 114)], legs: [to(135, 152, -1)], feet: [-70] },
    props: [
      { kind: 'rect', x: 40, y: 146, w: 50, h: 7 },
      { kind: 'line', from: [65, 153], to: [65, 166], w: 4 },
      { kind: 'line', from: [146, 130], to: [146, 166], w: 5 },
      { kind: 'cable', from: [150, 140], to: 'hand' },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  face_pull: {
    a: stand([to(149, 42, -1)], { torso: -94 }),
    b: stand([to(110, 34, -1)], { torso: -94 }),
    props: [
      { kind: 'line', from: [192, -16], to: [192, 166], w: 5 },
      { kind: 'cable', from: [188, 40], to: 'hand' },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  reverse_fly: {
    view: 'front',
    a: standFront([to(116, 128, -1)], { tl: 0.35, head: 90, hip: [100, 98], legs: [ang(84, 95)] }),
    b: standFront([to(158, 92, -1)], { tl: 0.35, head: 90, hip: [100, 98], legs: [ang(84, 95)] }),
    props: [{ kind: 'dumbbell', at: 'hand', both: true }],
  },
  shrug: {
    view: 'front',
    a: standFront([to(119, 97, -1)]),
    b: standFront([to(119, 88, -1)], { shrug: 8 }),
    props: [{ kind: 'dumbbell', at: 'hand', both: true }],
  },
  barbell_curl: {
    a: stand(curlDown),
    b: stand(curlUp),
    props: [{ kind: 'plate', at: 'hand' }],
  },
  dumbbell_curl: {
    a: stand(curlDown),
    b: stand(curlUp),
    props: [{ kind: 'dumbbell', at: 'hand' }],
  },
  hammer_curl: {
    a: stand(curlDown),
    b: stand(curlUp),
    props: [{ kind: 'dumbbell', at: 'hand', vertical: true }],
  },
  wrist_curl: {
    a: { hip: [90, 128], torso: -60, arms: [to(136, 120)], legs: [ang(0, 90)], wrist: 70 },
    b: { hip: [90, 128], torso: -60, arms: [to(136, 120)], legs: [ang(0, 90)], wrist: -40 },
    props: [
      { kind: 'rect', x: 62, y: 134, w: 40, h: 7 },
      { kind: 'line', from: [82, 141], to: [82, 166], w: 4 },
      { kind: 'dumbbell', at: 'wrist', vertical: true },
    ],
  },

  // ── Pierna ─────────────────────────────────────────────────────────────
  back_squat: {
    a: stand(backBarArms, { torso: -88, legs: [to(104, 166, -1)] }),
    b: { hip: [78, 128], torso: -50, arms: backBarArms, legs: [to(104, 166, -1)] },
    props: [backBar],
  },
  front_squat: {
    a: stand([relAng(-86, 100)], { legs: [to(104, 166, -1)] }),
    b: { hip: [80, 130], torso: -65, arms: [relAng(-86, 100)], legs: [to(104, 166, -1)] },
    props: [{ kind: 'plate', at: 'shoulder', off: [-3, -8] }],
  },
  leg_press: {
    a: { hip: [70, 130], torso: -150, arms: [to(82, 132)], legs: [to(132, 94, -1)], feet: [-120] },
    b: { hip: [70, 130], torso: -150, arms: [to(82, 132)], legs: [to(105, 108, -1)], feet: [-120] },
    props: [
      { kind: 'line', from: [82, 138], to: [18, 101], w: 7 },
      { kind: 'line', from: [70, 138], to: [70, 166], w: 4 },
      { kind: 'line', from: [96, 150], to: [184, 99], w: 3 },
      { kind: 'pad', at: 'ankle', shift: [5, -3], w: 6, h: 34, angle: 60 },
    ],
  },
  lunge: {
    a: { hip: [97, 102], torso: -90, arms: [ang(92, 92)], legs: [to(128, 166, -1), to(64, 162, -1)], feet: [0, 40] },
    b: { hip: [97, 130], torso: -90, arms: [ang(92, 92)], legs: [to(128, 166, -1), to(64, 162, -1)], feet: [0, 40] },
    props: [{ kind: 'dumbbell', at: 'hand' }],
  },
  bulgarian_split_squat: {
    a: { hip: [90, 96], torso: -86, arms: [ang(92, 92)], legs: [to(118, 166, -1), to(55, 124, -1)], feet: [0, 170] },
    b: { hip: [88, 126], torso: -78, arms: [ang(92, 92)], legs: [to(118, 166, -1), to(55, 124, -1)], feet: [0, 170] },
    props: [
      { kind: 'rect', x: 22, y: 128, w: 50, h: 7 },
      { kind: 'line', from: [30, 135], to: [30, 166], w: 4 },
      { kind: 'line', from: [64, 135], to: [64, 166], w: 4 },
      { kind: 'dumbbell', at: 'hand' },
    ],
  },
  leg_extension: {
    a: { hip: [90, 120], torso: -100, arms: [to(100, 126)], legs: [ang(0, 95)], feet: [-10] },
    b: { hip: [90, 120], torso: -100, arms: [to(100, 126)], legs: [ang(0, -5)], feet: [-95] },
    props: [
      { kind: 'rect', x: 62, y: 125, w: 64, h: 7 },
      { kind: 'line', from: [74, 124], to: [62, 64], w: 7 },
      { kind: 'line', from: [90, 132], to: [90, 166], w: 4 },
      { kind: 'roller', at: 'ankle', off: [0, 0], r: 6 },
    ],
  },
  deadlift: {
    a: { hip: [72.3, 124.4], torso: -25, arms: [to(110, 155)], legs: [to(104, 166, -1)] },
    b: stand([to(103, 97)], { legs: [to(104, 166, -1)] }),
    props: [{ kind: 'plate', at: 'hand' }],
  },
  romanian_deadlift: {
    a: stand([ang(90, 90)], { legs: [to(104, 166, -1)] }),
    b: { hip: [70, 104], torso: -12, arms: [ang(90, 90)], legs: [to(104, 166, -1)] },
    props: [{ kind: 'plate', at: 'hand' }],
  },
  good_morning: {
    a: stand(backBarArms, { legs: [to(102, 166, -1)] }),
    b: { hip: [72, 104], torso: -5, arms: backBarArms, legs: [to(102, 166, -1)] },
    props: [backBar],
  },
  leg_curl: {
    a: { hip: [95, 118], torso: 180, arms: [to(30, 127, -1)], legs: [ang(0, 0)], feet: [90] },
    b: { hip: [95, 118], torso: 180, arms: [to(30, 127, -1)], legs: [ang(0, -110)], feet: [-20] },
    props: [
      { kind: 'rect', x: 28, y: 124, w: 112, h: 7 },
      { kind: 'line', from: [40, 131], to: [40, 166], w: 4 },
      { kind: 'line', from: [128, 131], to: [128, 166], w: 4 },
      { kind: 'roller', at: 'ankle', off: [0, 0], r: 6 },
    ],
  },
  hip_thrust: {
    a: { hip: [95, 140], torso: -139, arms: [rel('hip', 2, -14)], legs: [to(126, 166, -1)] },
    b: { hip: [106, 110], torso: 180, arms: [rel('hip', 2, -14)], legs: [to(126, 166, -1)] },
    props: [
      { kind: 'rect', x: 22, y: 112, w: 42, h: 8 },
      { kind: 'line', from: [32, 120], to: [32, 166], w: 4 },
      { kind: 'line', from: [56, 120], to: [56, 166], w: 4 },
      { kind: 'plate', at: 'hip', off: [0, -10] },
    ],
  },
  calf_raise: {
    a: { hip: [100, 94], torso: -90, arms: [ang(92, 92)], legs: [to(100, 166, 0)], feet: [0] },
    b: { hip: [105.5, 84.5], torso: -90, arms: [ang(92, 92)], legs: [to(105.5, 156.5, 0)], feet: [60] },
    props: [{ kind: 'dumbbell', at: 'hand' }],
  },

  // ── Core ───────────────────────────────────────────────────────────────
  plank: {
    a: { hip: [104.9, 146.2], torso: -11.5, arms: [ang(90, 0)], legs: [to(36, 159, 0)], feet: [40] },
    b: { hip: [104.9, 144.6], torso: -12.3, arms: [ang(90, 0)], legs: [to(36, 159, 0)], feet: [40] },
    ms: 4000,
  },
  crunch: {
    a: { hip: [110, 158], torso: 180, arms: [relAng(-110, 112)], legs: [to(150, 163, -1)] },
    b: { hip: [110, 158], torso: -152, arms: [relAng(-110, 112)], legs: [to(150, 163, -1)] },
  },
  hanging_leg_raise: {
    ground: false,
    a: { hip: [100, 100], torso: -90, arms: [to(100, 4)], legs: [ang(90, 90)], feet: [10] },
    b: { hip: [94, 100], torso: -84, arms: [to(100, 4)], legs: [ang(2, 2)], feet: [-88] },
    props: [
      { kind: 'line', from: [40, 2], to: [160, 2], w: 5 },
      { kind: 'line', from: [44, 2], to: [44, -20], w: 4 },
      { kind: 'line', from: [156, 2], to: [156, -20], w: 4 },
    ],
  },
  back_extension: {
    a: { hip: [100, 96], torso: 75, arms: handsOnChest, legs: [ang(130, 130)], feet: [40] },
    b: { hip: [100, 96], torso: -50, arms: handsOnChest, legs: [ang(130, 130)], feet: [40] },
    props: [
      { kind: 'line', from: [104, 108], to: [96, 166], w: 4 },
      { kind: 'line', from: [46, 146], to: [40, 166], w: 4 },
      { kind: 'line', from: [40, 166], to: [96, 166], w: 4 },
      { kind: 'disc', at: [104, 104], r: 7 },
      { kind: 'disc', at: [48, 146], r: 5 },
    ],
  },
};

/** Animación de un ejercicio del catálogo, o null si no hay (los propios). */
export function motionFor(code: string | null | undefined): Motion | null {
  return code ? (MOTIONS[code] ?? null) : null;
}
