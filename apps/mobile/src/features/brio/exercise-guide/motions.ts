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

/** Asiento de máquina visto de perfil, con o sin respaldo. */
const seatSide = (back = true, tall = false): Prop[] => [
  { kind: 'rect', x: 62, y: 133, w: 50, h: 7 },
  { kind: 'line', from: [87, 140], to: [87, 166], w: 4 },
  ...(back ? [{ kind: 'line', from: [70, 132], to: [tall ? 58 : 62, tall ? 36 : 70], w: 7 } as Prop] : []),
];
/** Sentado en una máquina, de perfil. */
const seated = (arms: Limb[], over: Partial<Pose> = {}): Pose => ({
  hip: [90, 128],
  torso: -95,
  arms,
  legs: [ang(0, 90)],
  ...over,
});
/** Sentado, de frente (los muslos se ven acortados). */
const seatedFront = (arms: Limb[], over: Partial<Pose> = {}): Pose => ({
  hip: [100, 124],
  torso: -90,
  arms,
  legs: [{ a: 60, b: 92, k: 0.35 }],
  feet: [20],
  ...over,
});
const seatFront: Prop[] = [
  { kind: 'rect', x: 76, y: 128, w: 48, h: 7 },
  { kind: 'line', from: [100, 135], to: [100, 166], w: 4 },
];
/** Raíl de la máquina Smith en el x de la barra. */
const smithRail = (x: number): Prop => ({ kind: 'line', from: [x, -20], to: [x, 166], w: 3 });
/** Plataforma bajo las rodillas de las máquinas de asistencia (vista de frente). */
const assistPad: Prop = { kind: 'pad', at: 'knee', shift: [-7, 6], w: 4, h: 30, angle: 0 };
/** Tumbado en el suelo, cabeza a la izquierda. */
const FLOOR_HIP: Vec = [110, 158];

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

  // ── Máquinas, poleas y variantes ───────────────────────────────────────
  smith_bench_press: {
    a: supine([to(98, 66)]),
    b: supine([to(102, 97)]),
    props: [...flatBench, smithRail(100), { kind: 'plate', at: 'hand' }],
  },
  smith_incline_bench_press: {
    a: { hip: [120, 117], torso: -145, arms: [to(92, 45)], legs: [to(150, 165, -1)] },
    b: { hip: [120, 117], torso: -145, arms: [to(98, 80)], legs: [to(150, 165, -1)] },
    props: [
      { kind: 'line', from: [118, 124], to: [66, 87], w: 7 },
      { kind: 'line', from: [110, 124], to: [142, 124], w: 7 },
      { kind: 'line', from: [126, 126], to: [126, 166], w: 4 },
      smithRail(95),
      { kind: 'plate', at: 'hand' },
    ],
  },
  smith_decline_bench_press: {
    a: { hip: [126, 108], torso: 168, arms: [to(88, 68)], legs: [to(152, 136, -1)] },
    b: { hip: [126, 108], torso: 168, arms: [to(98, 100)], legs: [to(152, 136, -1)] },
    props: [
      { kind: 'line', from: [136, 113], to: [56, 130], w: 7 },
      { kind: 'line', from: [122, 118], to: [122, 166], w: 4 },
      { kind: 'line', from: [66, 128], to: [66, 166], w: 4 },
      { kind: 'roller', at: 'ankle', shift: [0, 5], r: 5 },
      smithRail(94),
      { kind: 'plate', at: 'hand' },
    ],
  },
  smith_squat: {
    a: stand(backBarArms, { torso: -88, legs: [to(110, 166, -1)] }),
    b: { hip: [76, 128], torso: -60, arms: backBarArms, legs: [to(110, 166, -1)] },
    props: [smithRail(92), backBar],
  },
  machine_chest_press: {
    a: seated([to(89, 90)]),
    b: seated([to(134, 84)]),
    props: [...seatSide(), { kind: 'roller', at: 'hand', r: 3 }],
  },
  machine_incline_chest_press: {
    a: seated([to(89, 88)]),
    b: seated([to(124, 48)]),
    props: [...seatSide(), { kind: 'roller', at: 'hand', r: 3 }],
  },
  pec_deck: {
    view: 'front',
    a: seatedFront([ang(4, -90)]),
    b: seatedFront([{ a: 10, b: -90, k: 0.35 }]),
    props: [...seatFront],
  },
  cable_lateral_raise: {
    view: 'front',
    a: standFront([to(108, 100, -1), to(80, 97, 1)]),
    b: standFront([to(160, 54, -1), to(80, 97, 1)]),
    props: [
      { kind: 'disc', at: [30, 160], r: 4 },
      { kind: 'line', from: [24, 166], to: [24, 120], w: 4 },
      { kind: 'cable', from: [30, 160], to: 'hand' },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  machine_lateral_raise: {
    view: 'front',
    a: seatedFront([to(120, 124, -1)]),
    b: seatedFront([to(158, 80, -1)]),
    props: [...seatFront],
  },
  cable_front_raise: {
    a: stand([to(104, 97, -1)]),
    b: stand([to(149, 44, -1)]),
    props: [
      { kind: 'line', from: [52, 166], to: [52, 120], w: 4 },
      { kind: 'cable', from: [58, 160], to: 'hand' },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  machine_shoulder_press: {
    a: seated([to(98, 78)]),
    b: seated([to(90, 33)]),
    props: [...seatSide(true, true), { kind: 'roller', at: 'hand', r: 3 }],
  },
  rope_pushdown: {
    a: stand([to(124, 62)], { torso: -84 }),
    b: stand([to(110, 97)], { torso: -84 }),
    props: [
      { kind: 'cable', from: [158, -8], to: 'hand' },
      { kind: 'line', from: [166, -16], to: [166, 166], w: 5 },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  overhead_triceps_extension: {
    a: stand([ang(-60, 150)], { torso: -75, legs: [to(112, 166, -1), to(86, 166, -1)] }),
    b: stand([ang(-60, -55)], { torso: -75, legs: [to(112, 166, -1), to(86, 166, -1)] }),
    props: [
      { kind: 'line', from: [22, -16], to: [22, 166], w: 5 },
      { kind: 'cable', from: [28, 64], to: 'hand' },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  seated_dip_machine: {
    a: seated([to(96, 100)], { torso: -90 }),
    b: seated([to(94, 130)], { torso: -90 }),
    props: [...seatSide(), { kind: 'roller', at: 'hand', r: 3 }],
  },
  bench_dip: {
    a: { hip: [88, 118], torso: -95, arms: [to(80, 118)], legs: [to(148, 163, -1)], feet: [-60] },
    b: { hip: [90, 146], torso: -95, arms: [to(80, 118)], legs: [to(148, 163, -1)], feet: [-60] },
    props: [
      { kind: 'rect', x: 36, y: 120, w: 46, h: 7 },
      { kind: 'line', from: [44, 127], to: [44, 166], w: 4 },
      { kind: 'line', from: [74, 127], to: [74, 166], w: 4 },
    ],
  },
  assisted_dip: {
    a: { hip: [92, 85.3], torso: -80, arms: [to(106, 88)], legs: [ang(100, 190)], feet: [100] },
    b: { hip: [88.3, 107.2], torso: -70, arms: [to(106, 88)], legs: [ang(98, 195)], feet: [105] },
    props: [
      { kind: 'line', from: [90, 93], to: [130, 93], w: 5 },
      { kind: 'line', from: [126, 93], to: [126, 166], w: 4 },
      { kind: 'pad', at: 'knee', shift: [-12, 7], w: 5, h: 28, angle: 0 },
    ],
  },
  iso_lateral_row: {
    a: seated([to(150, 78)], { torso: -75 }),
    b: seated([to(104, 96)], { torso: -75 }),
    props: [...seatSide(false), { kind: 'disc', at: [107, 101], r: 6 }, { kind: 'roller', at: 'hand', r: 3 }],
  },
  chin_up: {
    view: 'front',
    ground: false,
    a: { hip: [100, 104], torso: -90, arms: [to(126, 14)], legs: [ang(91, 92)], feet: [30] },
    b: { hip: [100, 68], torso: -90, arms: [to(126, 14)], legs: [ang(91, 92)], feet: [30] },
    props: [
      { kind: 'line', from: [40, 12], to: [160, 12], w: 5 },
      { kind: 'line', from: [44, 12], to: [44, -20], w: 4 },
      { kind: 'line', from: [156, 12], to: [156, -20], w: 4 },
    ],
  },
  assisted_pull_up: {
    view: 'front',
    ground: false,
    a: { hip: [100, 104], torso: -90, arms: [to(140, 14)], legs: [ang(91, 92)], feet: [30] },
    b: { hip: [100, 68], torso: -90, arms: [to(140, 14)], legs: [ang(91, 92)], feet: [30] },
    props: [
      { kind: 'line', from: [40, 12], to: [160, 12], w: 5 },
      { kind: 'line', from: [44, 12], to: [44, -20], w: 4 },
      { kind: 'line', from: [156, 12], to: [156, -20], w: 4 },
      assistPad,
    ],
  },
  assisted_chin_up: {
    view: 'front',
    ground: false,
    a: { hip: [100, 104], torso: -90, arms: [to(126, 14)], legs: [ang(91, 92)], feet: [30] },
    b: { hip: [100, 68], torso: -90, arms: [to(126, 14)], legs: [ang(91, 92)], feet: [30] },
    props: [
      { kind: 'line', from: [40, 12], to: [160, 12], w: 5 },
      { kind: 'line', from: [44, 12], to: [44, -20], w: 4 },
      { kind: 'line', from: [156, 12], to: [156, -20], w: 4 },
      assistPad,
    ],
  },
  rear_delt_machine: {
    view: 'front',
    a: seatedFront([to(104, 86, -1)]),
    b: seatedFront([to(160, 80, -1)]),
    props: [...seatFront],
  },
  incline_dumbbell_curl: {
    a: { hip: [95, 128], torso: -125, arms: [ang(95, 90)], legs: [ang(5, 90)] },
    b: { hip: [95, 128], torso: -125, arms: [ang(95, -60)], legs: [ang(5, 90)] },
    props: [
      { kind: 'line', from: [90, 133], to: [56, 84], w: 7 },
      { kind: 'rect', x: 80, y: 134, w: 40, h: 7 },
      { kind: 'line', from: [100, 141], to: [100, 166], w: 4 },
      { kind: 'dumbbell', at: 'hand' },
    ],
  },
  cable_curl: {
    a: stand(curlDown),
    b: stand(curlUp),
    props: [
      { kind: 'line', from: [156, 166], to: [156, 124], w: 4 },
      { kind: 'cable', from: [150, 160], to: 'hand' },
      { kind: 'roller', at: 'hand', r: 3 },
    ],
  },
  preacher_curl: {
    a: { hip: [88, 128], torso: -80, arms: [ang(40, 55)], legs: [ang(0, 90)] },
    b: { hip: [88, 128], torso: -80, arms: [ang(40, -85)], legs: [ang(0, 90)] },
    props: [
      { kind: 'rect', x: 62, y: 133, w: 50, h: 7 },
      { kind: 'line', from: [87, 140], to: [87, 166], w: 4 },
      { kind: 'line', from: [99, 93], to: [124, 113], w: 6 },
      { kind: 'line', from: [120, 113], to: [120, 166], w: 4 },
      { kind: 'plate', at: 'hand', r: 8 },
    ],
  },
  seated_leg_curl: {
    a: { hip: [90, 120], torso: -100, arms: [to(100, 126)], legs: [ang(0, -5)], feet: [-95] },
    b: { hip: [90, 120], torso: -100, arms: [to(100, 126)], legs: [ang(0, 100)], feet: [0] },
    props: [
      { kind: 'rect', x: 62, y: 125, w: 64, h: 7 },
      { kind: 'line', from: [74, 124], to: [62, 64], w: 7 },
      { kind: 'line', from: [90, 132], to: [90, 166], w: 4 },
      { kind: 'disc', at: [112, 112], r: 5 },
      { kind: 'roller', at: 'ankle', shift: [0, 5], r: 6 },
    ],
  },
  seated_calf_raise: {
    a: { hip: [80, 128], torso: -90, arms: [ang(60, 10)], legs: [to(117.2, 160.1, -1)], feet: [10] },
    b: { hip: [80, 128], torso: -90, arms: [ang(60, 10)], legs: [to(121.7, 153, -1)], feet: [55] },
    props: [
      { kind: 'rect', x: 52, y: 133, w: 46, h: 7 },
      { kind: 'line', from: [75, 140], to: [75, 166], w: 4 },
      { kind: 'rect', x: 120, y: 161, w: 22, h: 5 },
      { kind: 'roller', at: 'knee', shift: [0, -7], r: 6 },
    ],
  },
  hip_abduction: {
    view: 'front',
    a: seatedFront([to(124, 124, -1)], { legs: [{ a: 84, b: 92, k: 0.35 }] }),
    b: seatedFront([to(124, 124, -1)], { legs: [{ a: 40, b: 92, k: 0.55 }] }),
    props: [...seatFront],
  },
  hip_adduction: {
    view: 'front',
    a: seatedFront([to(124, 124, -1)], { legs: [{ a: 40, b: 92, k: 0.55 }] }),
    b: seatedFront([to(124, 124, -1)], { legs: [{ a: 84, b: 92, k: 0.35 }] }),
    props: [...seatFront],
  },
  box_jump: {
    a: { hip: [78, 118], torso: -50, arms: [ang(130, 120)], legs: [to(96, 166, -1)] },
    mid: { hip: [112, 84], torso: -70, arms: [ang(-20, -40)], legs: [ang(50, 125)] },
    b: { hip: [134, 62], torso: -86, arms: [ang(40, 20)], legs: [to(138, 128, -1)] },
    props: [{ kind: 'rect', x: 116, y: 128, w: 50, h: 38 }],
  },
  decline_crunch: {
    a: { hip: [124, 108], torso: 160, arms: [relAng(-110, 112)], legs: [to(156, 132, -1)] },
    b: { hip: [124, 108], torso: -155, arms: [relAng(-110, 112)], legs: [to(156, 132, -1)] },
    props: [
      { kind: 'line', from: [138, 113], to: [48, 146], w: 7 },
      { kind: 'line', from: [126, 118], to: [126, 166], w: 4 },
      { kind: 'line', from: [60, 142], to: [60, 166], w: 4 },
      { kind: 'roller', at: 'ankle', shift: [0, 5], r: 5 },
    ],
  },
  bicycle_crunch: {
    a: { hip: FLOOR_HIP, torso: -160, arms: [relAng(-110, 112)], legs: [ang(-70, 20), ang(-15, -15)] },
    b: { hip: FLOOR_HIP, torso: -158, arms: [relAng(-110, 112)], legs: [ang(-15, -15), ang(-70, 20)] },
    ms: 2200,
  },
  scissor_kicks: {
    a: { hip: FLOOR_HIP, torso: 180, arms: [relAng(-5, 0)], legs: [ang(-25, -25), ang(-8, -8)] },
    b: { hip: FLOOR_HIP, torso: 180, arms: [relAng(-5, 0)], legs: [ang(-8, -8), ang(-25, -25)] },
    ms: 1800,
  },
};

/** Animación de un ejercicio del catálogo, o null si no hay (los propios). */
/**
 * Ejercicios del catálogo de Brío que, vistos de perfil, se mueven igual que
 * otro que ya tiene animación (misma máquina o variante del mismo gesto).
 */
const SAME_MOTION: Record<string, string> = {
  dumbbell_incline_bench_press: 'incline_bench_press',
  smith_machine_bench_press: 'smith_bench_press',
  smith_machine_squat: 'smith_squat',
  close_grip_bench_press: 'bench_press',
  diamond_push_up: 'push_up',
  close_grip_lat_pulldown: 'lat_pulldown',
  t_bar_row: 'barbell_row',
  pendlay_row: 'barbell_row',
  machine_seated_row: 'seated_cable_row',
  machine_reverse_fly: 'rear_delt_machine',
  dumbbell_shrug: 'shrug',
  ez_bar_curl: 'barbell_curl',
  cable_overhead_triceps_extension: 'overhead_triceps_extension',
  walking_lunge: 'lunge',
  reverse_lunge: 'lunge',
  sumo_deadlift: 'deadlift',
  trap_bar_deadlift: 'deadlift',
  machine_hip_abduction: 'hip_abduction',
  machine_hip_adduction: 'hip_adduction',
  hanging_knee_raise: 'hanging_leg_raise',
  // Mismo gesto que otro ya animado (TASK-430).
  cable_crossover: 'chest_fly',
  cable_rear_delt_fly: 'reverse_fly',
  dumbbell_arnold_press: 'dumbbell_shoulder_press',
  push_press: 'overhead_press',
  rack_pull: 'deadlift',
  single_arm_cable_row: 'seated_cable_row',
  dumbbell_overhead_triceps_extension: 'overhead_triceps_extension',
  machine_bicep_curl: 'preacher_curl',
  reverse_curl: 'barbell_curl',
  sandbag_lunges: 'lunge',
  dumbbell_romanian_deadlift: 'romanian_deadlift',
  dumbbell_lunge: 'lunge',
  cable_hammer_curl: 'cable_curl',
  dumbbell_skull_crusher: 'skull_crusher',
  single_leg_press: 'leg_press',
  weighted_pull_up: 'pull_up',
  weighted_dip: 'dip',
  neutral_grip_lat_pulldown: 'lat_pulldown',
  reverse_grip_lat_pulldown: 'lat_pulldown',
  wide_grip_cable_row: 'seated_cable_row',
  machine_hip_thrust: 'hip_thrust',
  // Variantes del catálogo de Hevy (mismo gesto visto de perfil).
  cable_bench_press: 'bench_press',
  barbell_bench_press_wide_grip: 'bench_press',
  dumbbell_decline_bench_press: 'bench_press',
  machine_decline_bench_press: 'machine_chest_press',
  dumbbell_decline_chest_fly: 'chest_fly',
  band_chest_fly: 'chest_fly',
  cable_seated_chest_flys: 'chest_fly',
  machine_iso_lateral_chest_press: 'machine_chest_press',
  band_chest_press: 'push_up',
  barbell_floor_press: 'bench_press',
  dumbbell_floor_press: 'dumbbell_bench_press',
  dumbbell_hex_press: 'dumbbell_bench_press',
  weighted_push_up: 'push_up',
  kneeling_push_up: 'push_up',
  clap_push_up: 'push_up',
  wide_push_up: 'push_up',
  smith_machine_overhead_press: 'overhead_press',
  barbell_seated_overhead_press: 'overhead_press',
  dumbbell_seated_overhead_press: 'dumbbell_shoulder_press',
  barbell_behind_the_neck_press: 'overhead_press',
  kettlebell_shoulder_press: 'dumbbell_shoulder_press',
  band_lateral_raise: 'lateral_raise',
  dumbbell_seated_lateral_raise: 'lateral_raise',
  cable_single_arm_lateral_raise: 'cable_lateral_raise',
  cable_shrug: 'shrug',
  machine_shrug: 'shrug',
  smith_machine_shrug: 'shrug',
  band_pull_up: 'pull_up',
  wide_pull_up: 'pull_up',
  weighted_chin_up: 'chin_up',
  band_lat_pulldown: 'lat_pulldown',
  single_arm_lat_pulldown: 'lat_pulldown',
  band_bent_over_row: 'barbell_row',
  seated_cable_row_bar_wide_grip: 'seated_cable_row',
  machine_iso_lateral_high_row: 'iso_lateral_row',
  iso_lateral_low_row: 'iso_lateral_row',
  barbell_meadows_rows: 'dumbbell_row',
  kettlebell_gorilla_row: 'dumbbell_row',
  dumbbell_deadlift: 'deadlift',
  smith_machine_deadlift: 'deadlift',
  band_deadlift: 'deadlift',
  stiff_leg_deadlift: 'romanian_deadlift',
  band_bicep_curl: 'barbell_curl',
  band_hammer_curl: 'hammer_curl',
  cross_body_hammer_curl: 'hammer_curl',
  barbell_spider_curl: 'barbell_curl',
  drag_curl: 'barbell_curl',
  dumbbell_zottman_curl: 'dumbbell_curl',
  cable_reverse_curl: 'barbell_curl',
  cable_behind_the_back_curl: 'cable_curl',
  rope_cable_curl: 'cable_curl',
  '21s_bicep_curl': 'barbell_curl',
  dumbbell_pinwheel_curl: 'hammer_curl',
  waiter_curl: 'dumbbell_curl',
  dumbbell_wrist_curl: 'wrist_curl',
  barbell_reverse_wrist_curl: 'wrist_curl',
  cable_single_arm_triceps_pushdown: 'triceps_pushdown',
  barbell_triceps_extension: 'overhead_triceps_extension',
  weighted_triceps_dip: 'dip',
  barbell_jm_press: 'skull_crusher',
  barbell_box_squat: 'back_squat',
  barbell_pause_squat: 'back_squat',
  overhead_squat: 'back_squat',
  zercher_squat: 'front_squat',
  machine_belt_squat: 'back_squat',
  dumbbell_split_squat: 'lunge',
  bodyweight_lunge: 'lunge',
  dumbbell_curtsy_lunge: 'lunge',
  jumping_lunge: 'lunge',
  overhead_dumbbell_lunge: 'lunge',
  single_leg_extensions: 'leg_extension',
  standing_leg_curls: 'leg_curl',
  smith_machine_hip_thrust: 'hip_thrust',
  dumbbell_single_leg_hip_thrust: 'hip_thrust',
  dumbbell_standing_calf_raise: 'calf_raise',
  barbell_standing_calf_raise: 'calf_raise',
  smith_standing_calf_raise: 'calf_raise',
  bodyweight_standing_calf_raise: 'calf_raise',
  single_leg_standing_calf_raise: 'calf_raise',
  weighted_crunch: 'crunch',
  oblique_crunch: 'crunch',
  elbow_to_knee: 'bicycle_crunch',
  toes_to_bar: 'hanging_leg_raise',
  knee_raise_parallel_bars: 'hanging_leg_raise',
  leg_raise_parallel_bars: 'hanging_leg_raise',
  flutter_kicks: 'scissor_kicks',
  plank_pushup: 'plank',
};

export function motionFor(code: string | null | undefined): Motion | null {
  if (!code) return null;
  return MOTIONS[code] ?? MOTIONS[SAME_MOTION[code]] ?? null;
}
