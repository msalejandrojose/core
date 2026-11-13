import type { HealthBaseline } from './garmin';
import {
  recoveryOptions,
  recoveryScore,
  type RecoveryInputs,
} from './recovery';

const none: HealthBaseline = { latest: null, baseline: null, deltaPct: null };
const at = (latest: number, deltaPct: number | null): HealthBaseline => ({
  latest,
  baseline: deltaPct === null ? null : 1,
  deltaPct,
});
const inputs = (over: Partial<RecoveryInputs> = {}): RecoveryInputs => ({
  sleep: none,
  hrv: none,
  restingHr: none,
  load: { status: 'USUAL', ratio: 1, weekChangePct: 0 },
  demandingLast7: 0,
  streakDays: 0,
  ...over,
});

describe('puntuación de recuperación', () => {
  it('sin ningún dato no inventa una puntuación', () => {
    const r = recoveryScore(
      inputs({
        load: { status: 'INSUFFICIENT_DATA', ratio: null, weekChangePct: null },
      }),
    );
    expect(r.score).toBeNull();
    expect(r.level).toBeNull();
  });

  it('con todo en tu media queda en la base, moderada-alta', () => {
    const r = recoveryScore(
      inputs({
        sleep: at(7.5 * 3600, 0),
        hrv: at(50, 0),
        restingHr: at(52, 0),
      }),
    );
    expect(r.score).toBe(72);
    expect(r.level).toBe('MODERATE');
    expect(r.limiting).toBeNull();
  });

  it('dormir bien, variabilidad alta y poca carga suben la puntuación', () => {
    const r = recoveryScore(
      inputs({
        sleep: at(8 * 3600, 10),
        hrv: at(55, 10),
        restingHr: at(50, -4),
        load: { status: 'BELOW_USUAL', ratio: 0.7, weekChangePct: -20 },
      }),
    );
    // 72 + 6 + 8 + 5 (tope) + 3
    expect(r.score).toBe(94);
    expect(r.level).toBe('GOOD');
  });

  it('mala noche, variabilidad baja y mucha carga la hunden, y dice qué pesa más', () => {
    const r = recoveryScore(
      inputs({
        sleep: at(5 * 3600, -30),
        hrv: at(38, -18),
        restingHr: at(57, 6),
        load: { status: 'WELL_ABOVE_USUAL', ratio: 1.7, weekChangePct: 40 },
        demandingLast7: 3,
        streakDays: 7,
      }),
    );
    // 72 − 22 (sueño: −14 tope y −8 por menos de 6 h) − 14 − 9 − 24
    expect(r.score).toBe(5);
    expect(r.level).toBe('LOW');
    expect(r.limiting).toBe('LOAD');
    expect(r.factors.find((f) => f.key === 'SLEEP')).toMatchObject({
      points: -22,
      good: false,
    });
  });

  it('funciona solo con la carga, sin reloj', () => {
    const r = recoveryScore(
      inputs({
        load: { status: 'ABOVE_USUAL', ratio: 1.4, weekChangePct: 25 },
      }),
    );
    expect(r.score).toBe(64);
    expect(r.limiting).toBe('LOAD');
  });
});

describe('propuestas para mañana', () => {
  const series = {
    kind: 'RUN',
    title: 'Series 6 × 800 m',
    load: 'HIGH',
  } as const;
  const ids = (o: { id: string; recommended: boolean }[]) =>
    o.map((x) => `${x.id}${x.recommended ? '*' : ''}`);

  it('no propone nada si mañana no hay sesión exigente', () => {
    expect(recoveryOptions('LOW', null, null)).toEqual([]);
    expect(
      recoveryOptions(
        'LOW',
        { kind: 'OTHER', title: 'Movilidad', load: 'LOW' },
        null,
      ),
    ).toEqual([]);
  });

  it('con buena recuperación solo mantiene el plan', () => {
    expect(ids(recoveryOptions('GOOD', series, null))).toEqual(['KEEP*']);
  });

  it('con recuperación moderada recomienda suavizar y ofrece mover si el día siguiente está libre', () => {
    const o = recoveryOptions('MODERATE', series, null);
    expect(ids(o)).toEqual(['EASY*', 'MOVE', 'KEEP']);
    expect(o[0]).toMatchObject({ templateCode: 'z2', kcalDelta: -350 });
    expect(o[1].kcalDelta).toBe(-800);
  });

  it('no ofrece mover si el día siguiente ya es exigente', () => {
    expect(
      ids(
        recoveryOptions('MODERATE', series, {
          kind: 'RUN',
          title: 'Tirada larga',
          load: 'HIGH',
        }),
      ),
    ).toEqual(['EASY*', 'KEEP']);
  });

  it('con recuperación baja recomienda descansar', () => {
    const o = recoveryOptions('LOW', series, null);
    expect(ids(o)).toEqual(['EASY', 'MOVE', 'REST*', 'KEEP']);
    expect(o.find((x) => x.id === 'REST')).toMatchObject({
      templateCode: 'rest',
      kcalDelta: -800,
    });
  });

  it('la fuerza se suaviza a movilidad y un rodaje medio no se cambia por otro igual', () => {
    expect(
      recoveryOptions(
        'MODERATE',
        { kind: 'STRENGTH', title: 'Fuerza', load: 'MEDIUM' },
        null,
      )[0],
    ).toMatchObject({ id: 'EASY', templateCode: 'mov' });
    expect(
      ids(
        recoveryOptions(
          'MODERATE',
          { kind: 'RUN', title: 'Rodaje Z2', load: 'MEDIUM' },
          null,
        ),
      ),
    ).toEqual(['MOVE*', 'KEEP']);
  });
});
