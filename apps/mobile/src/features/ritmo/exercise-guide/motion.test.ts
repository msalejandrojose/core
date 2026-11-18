import { describe, expect, it } from 'vitest';
import { BODY, lerpPose, phase, poseAt, solvePose, type Frame, type Vec } from './motion';
import { MOTIONS, motionFor } from './motions';

/** Los códigos del catálogo global (apps/api/src/seeds/ritmo-exercises.data.ts). */
const CATALOG = [
  'bench_press', 'incline_bench_press', 'dumbbell_bench_press', 'chest_fly', 'push_up', 'dip',
  'overhead_press', 'dumbbell_shoulder_press', 'lateral_raise', 'triceps_pushdown', 'skull_crusher',
  'pull_up', 'lat_pulldown', 'barbell_row', 'dumbbell_row', 'seated_cable_row', 'face_pull',
  'reverse_fly', 'shrug', 'barbell_curl', 'dumbbell_curl', 'hammer_curl', 'wrist_curl',
  'back_squat', 'front_squat', 'leg_press', 'lunge', 'bulgarian_split_squat', 'leg_extension',
  'deadlift', 'romanian_deadlift', 'good_morning', 'leg_curl', 'hip_thrust', 'calf_raise',
  'plank', 'crunch', 'hanging_leg_raise', 'back_extension',
  'smith_bench_press', 'smith_incline_bench_press', 'smith_decline_bench_press', 'smith_squat',
  'machine_chest_press', 'machine_incline_chest_press', 'pec_deck', 'cable_lateral_raise',
  'machine_lateral_raise', 'cable_front_raise', 'machine_shoulder_press', 'rope_pushdown',
  'overhead_triceps_extension', 'seated_dip_machine', 'bench_dip', 'assisted_dip', 'iso_lateral_row',
  'chin_up', 'assisted_pull_up', 'assisted_chin_up', 'rear_delt_machine', 'incline_dumbbell_curl',
  'cable_curl', 'preacher_curl', 'seated_leg_curl', 'seated_calf_raise', 'hip_abduction',
  'hip_adduction', 'box_jump', 'decline_crunch', 'bicycle_crunch', 'scissor_kicks',
];

const dist = (p: Vec, q: Vec) => Math.hypot(p[0] - q[0], p[1] - q[1]);

function expectSound(frame: Frame, foreshortened: boolean) {
  const points = [frame.hip, frame.shoulder, frame.head, ...frame.arms.flatMap((l) => [l.root, l.mid, l.end]), ...frame.legs.flatMap((l) => [l.root, l.mid, l.end])];
  for (const p of points) {
    expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true);
    // Dentro del lienzo (con margen para el material).
    expect(p[0]).toBeGreaterThan(-10);
    expect(p[0]).toBeLessThan(210);
  }
  // Los huesos no se estiran: el antebrazo y la espinilla miden siempre lo mismo.
  for (const arm of frame.arms) expect(dist(arm.mid, arm.end)).toBeCloseTo(BODY.forearm, 3);
  for (const leg of frame.legs) {
    expect(dist(leg.mid, leg.end)).toBeCloseTo(BODY.shin, 3);
    if (!foreshortened) expect(dist(leg.root, leg.mid)).toBeCloseTo(BODY.thigh, 3);
  }
}

describe('animaciones de ejercicios', () => {
  it('hay una para cada ejercicio del catálogo, y ninguna de más', () => {
    expect(Object.keys(MOTIONS).sort()).toEqual([...CATALOG].sort());
  });

  it.each(CATALOG)('%s: la figura es coherente en todo el recorrido', (code) => {
    const m = MOTIONS[code];
    const foreshortened = [m.a, m.b, ...(m.mid ? [m.mid] : [])].some((p) => p.legs.some((l) => 'k' in l && l.k !== undefined));
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expectSound(solvePose(poseAt(m, t), m.view), foreshortened);
    }
  });

  it('de frente, el segundo brazo es el reflejo del primero', () => {
    const m = MOTIONS.lateral_raise;
    const f = solvePose(m.b, 'front');
    const axis = f.hip[0];
    expect(f.arms[1].end[0]).toBeCloseTo(2 * axis - f.arms[0].end[0], 3);
    expect(f.arms[1].end[1]).toBeCloseTo(f.arms[0].end[1], 3);
  });

  it('los ángulos se interpolan por el camino corto', () => {
    // El crunch pasa de 180° a -152°: a mitad debe ir por 194°, no por 14°.
    const mid = lerpPose(MOTIONS.crunch.a, MOTIONS.crunch.b, 0.5);
    expect(((mid.torso % 360) + 360) % 360).toBeCloseTo(194, 3);
  });

  it('el ciclo pausa al inicio y al final y vuelve al principio', () => {
    expect(phase(0)).toBe(0);
    expect(phase(0.55)).toBe(1);
    expect(phase(0.31)).toBeGreaterThan(0.4);
    expect(phase(0.31)).toBeLessThan(0.6);
    expect(phase(0.999)).toBeCloseTo(0, 2);
    expect(phase(1.55)).toBe(1);
  });

  it('los ejercicios propios no tienen animación', () => {
    expect(motionFor(null)).toBeNull();
    expect(motionFor('mi_invento')).toBeNull();
  });
});
