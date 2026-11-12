import type { TrainingSession } from '../../entities/performance.entity';
import {
  analyzeCardio,
  danielsVo2max,
  detectCardioPlateau,
  heartZones,
  lactateThreshold,
  predictRaces,
  riegel,
  timeInZones,
  vo2max,
  zoneOf,
} from './cardio-engine';
import { addDays } from './stats';
import { session } from './test-helpers';

const TODAY = '2026-11-12';

/** Carrera: distancia (km), duración (min) y extras. */
function run(
  daysAgo: number,
  km: number,
  minutes: number,
  extra: Partial<TrainingSession> = {},
): TrainingSession {
  return session(addDays(TODAY, -daysAgo), {
    kind: 'RUN',
    distanceM: km * 1000,
    durationSec: minutes * 60,
    elevationGainM: 20,
    ...extra,
  });
}

describe('heartZones', () => {
  it('reparte por porcentaje de la FC máxima', () => {
    const z = heartZones({
      maxHr: 190,
      restingHr: null,
      method: 'MAX_HR',
      customZones: null,
    })!;
    expect(z.map((x) => x.min)).toEqual([95, 114, 133, 152, 171]);
    expect(z[4].max).toBe(190);
  });

  it('usa la reserva cardíaca con Karvonen', () => {
    const z = heartZones({
      maxHr: 190,
      restingHr: 50,
      method: 'HR_RESERVE',
      customZones: null,
    })!;
    expect(z.map((x) => x.min)).toEqual([120, 134, 148, 162, 176]);
  });

  it('respeta las zonas personalizadas', () => {
    const z = heartZones({
      maxHr: 188,
      restingHr: null,
      method: 'CUSTOM',
      customZones: [120, 140, 158, 172],
    })!;
    expect(z.map((x) => x.max)).toEqual([120, 140, 158, 172, 188]);
  });

  it('sin los datos necesarios no inventa zonas', () => {
    expect(heartZones(null)).toBeNull();
    expect(
      heartZones({
        maxHr: 190,
        restingHr: null,
        method: 'HR_RESERVE',
        customZones: null,
      }),
    ).toBeNull();
  });

  it('asigna cada frecuencia a su zona', () => {
    const z = heartZones({
      maxHr: 190,
      restingHr: null,
      method: 'MAX_HR',
      customZones: null,
    })!;
    expect(zoneOf(90, z)).toBeNull();
    expect(zoneOf(120, z)).toBe(2);
    expect(zoneOf(171, z)).toBe(5);
    expect(zoneOf(200, z)).toBe(5);
  });
});

describe('timeInZones', () => {
  const zones = heartZones({
    maxHr: 190,
    restingHr: null,
    method: 'MAX_HR',
    customZones: null,
  });

  it('separa lo registrado por el dispositivo de lo aproximado', () => {
    const t = timeInZones(
      [
        run(1, 8, 45, { zoneSeconds: [300, 1500, 700, 200, 0] }),
        run(3, 6, 30, { avgHeartRate: 140 }),
        run(5, 5, 30),
        run(40, 10, 60, { avgHeartRate: 140 }),
      ],
      zones,
      TODAY,
      30,
    );
    expect(t.seconds).toEqual([300, 1500, 700 + 1800, 200, 0]);
    expect(t.recordedSec).toBe(2700);
    expect(t.estimatedSec).toBe(1800);
    expect(t.unassignedSessions).toBe(1);
  });
});

describe('predictRaces', () => {
  it('aplica Riegel desde el mejor resultado reciente', () => {
    const p = predictRaces(
      [run(10, 10, 50, { rpe: 9 }), run(4, 8, 48, { rpe: 4 })],
      TODAY,
    )!;
    expect(p.basis).toMatchObject({ distanceM: 10000, hardEffort: true });
    const five = p.predictions.find((x) => x.race === '5K')!;
    expect(five.timeSec).toBe(Math.round(riegel(3000, 10000, 5000)));
    expect(five.uncertaintyPct).toBe(3);
    expect(five.lowSec).toBeLessThan(five.timeSec);
    const half = p.predictions.find((x) => x.race === 'HALF_MARATHON')!;
    expect(half.extrapolated).toBe(true);
    expect(half.uncertaintyPct).toBe(6);
  });

  it('avisa y amplía la horquilla si la base no fue un esfuerzo máximo', () => {
    const p = predictRaces([run(4, 8, 48, { rpe: 4 })], TODAY)!;
    expect(p.basis.hardEffort).toBe(false);
    expect(p.predictions[0].uncertaintyPct).toBe(7);
    expect(p.assumptions.join(' ')).toContain('mínimo');
  });

  it('no predice con resultados viejos, cortos o de montaña', () => {
    expect(predictRaces([run(120, 10, 50)], TODAY)).toBeNull();
    expect(predictRaces([run(5, 2, 9)], TODAY)).toBeNull();
    expect(
      predictRaces([run(5, 10, 70, { elevationGainM: 600 })], TODAY),
    ).toBeNull();
  });
});

describe('vo2max y umbral', () => {
  it('Daniels da un valor plausible para 10 km en 50 min', () => {
    expect(danielsVo2max(10000, 3000)).toBeCloseTo(40, 0);
  });

  it('no estima sin un esfuerzo exigente y mantiene lo medido aparte', () => {
    const measured = [
      {
        id: 'm1',
        metric: 'VO2MAX' as const,
        value: 52,
        heartRate: null,
        origin: 'DEVICE' as const,
        sourceLabel: 'Reloj',
        measuredOn: '2026-11-01',
      },
    ];
    const r = vo2max([run(3, 8, 48, { rpe: 4 })], measured, TODAY);
    expect(r.measured).toMatchObject({ value: 52, origin: 'DEVICE' });
    expect(r.estimated).toBeNull();
    expect(r.noEstimateReason).toContain('RPE 8');
  });

  it('estima el VO2max solo desde un esfuerzo exigente', () => {
    const r = vo2max([run(3, 10, 50, { rpe: 9 })], [], TODAY);
    expect(r.measured).toBeNull();
    expect(r.estimated?.value).toBeCloseTo(40, 0);
    expect(r.estimated?.method).toContain('Daniels');
  });

  it('estima el umbral desde un esfuerzo continuo de 25 a 65 minutos', () => {
    const r = lactateThreshold(
      [run(3, 8, 40, { rpe: 9, avgHeartRate: 172 })],
      [],
      TODAY,
    );
    // 5:00/km sostenidos 40 min: el ritmo de una hora es algo más lento.
    expect(r.estimated!.value).toBeGreaterThan(300);
    expect(r.estimated!.value).toBeLessThan(315);
    expect(r.estimated!.heartRate).toBe(172);
    expect(
      lactateThreshold([run(3, 3, 12, { rpe: 9 })], [], TODAY).estimated,
    ).toBeNull();
  });
});

describe('detectCardioPlateau', () => {
  /** Una carrera de 8 km por semana, con el ritmo (min/km) y la FC dados. */
  const weekly = (paces: number[], hr: number | number[] = 150) =>
    paces.map((pace, i) =>
      run(7 * (paces.length - 1 - i), 8, 8 * pace, {
        avgHeartRate: Array.isArray(hr) ? hr[i] : hr,
      }),
    );

  it('sin sesiones suficientes no clasifica', () => {
    const r = detectCardioPlateau(weekly([5.5, 5.5, 5.4]), 'RUN', TODAY);
    expect(r.status).toBe('INSUFFICIENT_DATA');
  });

  it('detecta mejora de eficiencia: más rápido a las mismas pulsaciones', () => {
    const r = detectCardioPlateau(
      weekly([5.6, 5.6, 5.5, 5.4, 5.3, 5.2]),
      'RUN',
      TODAY,
    );
    expect(r.status).toBe('PROGRESSING');
    expect(r.evidence.metric).toBe('EFFICIENCY');
    expect(r.signals).toContain('EFFICIENCY_UP');
    expect(r.evidence.recentPaceSecPerKm).toBeLessThan(
      r.evidence.baselinePaceSecPerKm!,
    );
  });

  it('marca posible estancamiento con ritmos y pulsaciones iguales', () => {
    const r = detectCardioPlateau(
      weekly([5.5, 5.5, 5.5, 5.5, 5.5, 5.5]),
      'RUN',
      TODAY,
    );
    expect(r.status).toBe('POTENTIAL_PLATEAU');
    expect(r.signals).toContain('NO_PACE_GAIN');
  });

  it('marca retroceso si sube la FC al mismo ritmo de forma persistente', () => {
    const r = detectCardioPlateau(
      weekly([5.5, 5.5, 5.5, 5.5, 5.5, 5.5], [146, 147, 146, 156, 157, 158]),
      'RUN',
      TODAY,
    );
    expect(r.status).toBe('REGRESSION');
    expect(r.signals).toContain('EFFICIENCY_DOWN');
    expect(r.signals).toContain('HR_UP_AT_SIMILAR_PACE');
    expect(r.evidence.hrShiftAtSimilarPace).toBeGreaterThanOrEqual(3);
  });

  it('una sola sesión mala no es retroceso', () => {
    const r = detectCardioPlateau(
      weekly([5.5, 5.5, 5.5, 5.5, 6.4, 5.5]),
      'RUN',
      TODAY,
    );
    expect(r.status).not.toBe('REGRESSION');
  });

  it('no mezcla montaña con llano', () => {
    const hilly = weekly([7, 7, 7]).map((s) => ({ ...s, elevationGainM: 500 }));
    const r = detectCardioPlateau(
      [...weekly([5.5, 5.5, 5.5, 5.5, 5.5, 5.5]), ...hilly],
      'RUN',
      TODAY,
    );
    expect(r.evidence.sessions).toBe(6);
  });
});

describe('analyzeCardio', () => {
  it('resume por disciplina solo el periodo pedido', () => {
    const a = analyzeCardio(
      [
        run(2, 10, 50, { avgHeartRate: 150, maxHeartRate: 176, rpe: 6 }),
        run(20, 5, 27, { avgHeartRate: 148 }),
        session(addDays(TODAY, -3), {
          kind: 'CYCLE',
          distanceM: 30000,
          durationSec: 3600,
        }),
        session(addDays(TODAY, -1), { kind: 'STRENGTH' }),
      ],
      null,
      [],
      { today: TODAY, periodDays: 7 },
    );
    const runs = a.byKind.find((k) => k.kind === 'RUN')!;
    expect(runs).toMatchObject({
      sessions: 1,
      distanceM: 10000,
      avgPaceSecPerKm: 300,
      avgSpeedKmh: 12,
      peakHeartRate: 176,
    });
    expect(a.byKind.find((k) => k.kind === 'CYCLE')?.avgSpeedKmh).toBe(30);
    expect(a.dataQuality).toMatchObject({ sessions: 2, withHeartRate: 1 });
    expect(a.zones).toBeNull();
    expect(a.timeInZones.unassignedSessions).toBe(2);
  });
});
