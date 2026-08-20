import { computeCarStats, effectiveGrip } from './car-stats';
import { CarArchetype } from './entities/car-archetype.entity';
import { CarPart, CarPartCategory } from './entities/car-part.entity';

// Mismos valores de partida decididos en TASK-262/263.
const NORMAL = new CarArchetype('a1', 'normal', 'Normal', 1.0, 1.0, 1.0, true, null, true);
const F1 = new CarArchetype('a2', 'f1', 'F1', 1.25, 1.0, 0.85, true, null, true);
const AWD = new CarArchetype('a3', '4x4', '4x4', 0.85, 1.0, 1.15, true, null, true);

const GRIP_TIRES = new CarPart(
  'p1',
  'tires-grip',
  CarPartCategory.TIRES,
  'Neumáticos de agarre',
  -0.05,
  0.1,
  true,
  null,
  true,
);
const SPEED_TIRES = new CarPart(
  'p2',
  'tires-speed',
  CarPartCategory.TIRES,
  'Neumáticos de velocidad',
  0.1,
  -0.05,
  true,
  null,
  true,
);

describe('computeCarStats', () => {
  it('sin piezas, devuelve el perfil base del arquetipo', () => {
    expect(computeCarStats(NORMAL, {})).toEqual({ speedScale: 1.0, grip: 1.0 });
  });

  it('suma los deltas de las piezas equipadas al perfil base', () => {
    const stats = computeCarStats(F1, { tires: GRIP_TIRES });
    expect(stats.speedScale).toBeCloseTo(1.25 - 0.05);
    expect(stats.grip).toBeCloseTo(1.0 + 0.1);
  });

  it('combina varias piezas de categorías distintas', () => {
    const wing = new CarPart(
      'p3',
      'wing-big',
      CarPartCategory.WING,
      'Alerón grande',
      -0.08,
      0.12,
      true,
      null,
      true,
    );
    const stats = computeCarStats(NORMAL, { tires: SPEED_TIRES, wing });
    expect(stats.speedScale).toBeCloseTo(1.0 + 0.1 - 0.08);
    expect(stats.grip).toBeCloseTo(1.0 - 0.05 + 0.12);
  });
});

describe('effectiveGrip', () => {
  it('en asfalto seco no aplica el modificador fuera de asfalto', () => {
    const f1Grip = effectiveGrip(F1, {}, 1.0, false);
    const awdGrip = effectiveGrip(AWD, {}, 1.0, false);
    // Mismo grip base (1.0 los dos arquetipos): sin ajuste, deben coincidir.
    expect(f1Grip).toBeCloseTo(awdGrip);
  });

  it('fuera de asfalto, el F1 pierde más agarre que el 4x4', () => {
    const surfaceGrip = 0.55; // nevado
    const f1Grip = effectiveGrip(F1, {}, surfaceGrip, true);
    const awdGrip = effectiveGrip(AWD, {}, surfaceGrip, true);
    expect(f1Grip).toBeLessThan(awdGrip);
  });

  it('el modificador multiplica el grip de la superficie, no lo sustituye', () => {
    expect(effectiveGrip(NORMAL, {}, 0.55, true)).toBeCloseTo(0.55 * 1.0 * 1.0);
    expect(effectiveGrip(F1, {}, 0.55, true)).toBeCloseTo(0.55 * 1.0 * 0.85);
    expect(effectiveGrip(AWD, {}, 0.55, true)).toBeCloseTo(0.55 * 1.0 * 1.15);
  });

  it('las piezas equipadas también entran en el cálculo', () => {
    const withTires = effectiveGrip(NORMAL, { tires: GRIP_TIRES }, 1.0, false);
    const without = effectiveGrip(NORMAL, {}, 1.0, false);
    expect(withTires).toBeGreaterThan(without);
  });
});
