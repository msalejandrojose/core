import { analyzeFatigue } from './fatigue-engine';
import { analyzeHybrid } from './hybrid-engine';
import { analyzeMuscles } from './muscle-engine';
import { addDays } from './stats';
import { analyzeStrength } from './strength-engine';
import { exercise, session, sets } from './test-helpers';

const TODAY = '2026-11-12';
const bench = exercise('bench', [['CHEST', 1]]);
const day = (ago: number, kg: number) =>
  session(addDays(TODAY, -ago), {
    rpe: 7,
    sets: sets('bench', [
      [kg, 8, 2],
      [kg, 8, 2],
    ]),
  });
const HISTORY = [day(100, 60), day(40, 65), day(20, 67.5), day(3, 70)];

describe('periodo en los motores', () => {
  it('fuerza: resume solo las sesiones del periodo y deja el historial entero', () => {
    const a = analyzeStrength(HISTORY, [bench], {
      today: TODAY,
      bodyWeightKg: 80,
      periodDays: 30,
    });
    const b = a.exercises[0];
    expect(a.periodDays).toBe(30);
    expect(b.sessions).toBe(4);
    expect(b.period).toMatchObject({
      sessions: 2,
      workingSets: 4,
      volumeKg: 67.5 * 16 + 70 * 16,
    });
    expect(b.period.firstE1rm).toBeLessThan(b.period.lastE1rm!);
    expect(b.period.changePct).toBeGreaterThan(0);
  });

  it('fuerza: sin periodo, el resumen es todo el historial', () => {
    const b = analyzeStrength(HISTORY, [bench], {
      today: TODAY,
      bodyWeightKg: 80,
    }).exercises[0];
    expect(b.period.sessions).toBe(4);
  });

  it('músculos: añade la ventana del periodo pedido', () => {
    const opts = { today: TODAY, bodyWeightKg: 80 };
    const chest = (periodDays: number | null) =>
      analyzeMuscles(HISTORY, [bench], { ...opts, periodDays }).muscles.find(
        (m) => m.muscle === 'CHEST',
      )!;
    expect(chest(182).period.directSets).toBe(8);
    expect(chest(30).period.directSets).toBe(4);
    expect(chest(null).period).toEqual(chest(null).allTime);
  });

  it('carga: acumula sesiones y carga del periodo', () => {
    const muscles = analyzeMuscles(HISTORY, [bench], {
      today: TODAY,
      bodyWeightKg: 80,
    });
    const f = analyzeFatigue(HISTORY, null, muscles, {
      today: TODAY,
      now: new Date(`${TODAY}T20:00:00.000Z`),
      sex: null,
      periodDays: 30,
    });
    expect(f.period).toMatchObject({
      days: 30,
      sessions: 2,
      load: 2 * 7 * 60,
      activeDays: 2,
      demandingSessions: 0,
    });
  });

  it('híbrido: el reparto usa el periodo y por defecto 4 semanas', () => {
    const strength = analyzeStrength(HISTORY, [bench], {
      today: TODAY,
      bodyWeightKg: 80,
    });
    const sessions = (days?: number | null) =>
      analyzeHybrid(HISTORY, [bench], strength, [], TODAY, days).balance;
    expect(sessions()).toMatchObject({
      windowDays: 28,
      strength: { sessions: 2 },
    });
    expect(sessions(90).strength.sessions).toBe(3);
    expect(sessions(null).strength.sessions).toBe(4);
  });
});
