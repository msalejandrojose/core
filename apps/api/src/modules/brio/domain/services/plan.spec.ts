import type { ActualSession, PlannedSession } from '../entities/plan.entity';
import {
  buildWeek,
  isoWeek,
  mondayOf,
  templateByCode,
  weekDays,
  weekDiet,
} from './plan';

const TODAY = '2026-11-12'; // jueves

function planned(
  day: string,
  data: Partial<PlannedSession> = {},
): PlannedSession {
  return {
    id: `p-${day}`,
    planId: null,
    day,
    kind: 'RUN',
    templateCode: 'z2',
    title: 'Rodaje Z2',
    load: 'MEDIUM',
    startTime: null,
    plannedDurationMin: 45,
    plannedDistanceM: null,
    targetPaceSecPerKm: null,
    structure: null,
    notes: null,
    completedAt: null,
    completedSessionId: null,
    actualNotes: null,
    skipped: false,
    ...data,
  };
}
const actual = (
  day: string,
  kind: ActualSession['kind'],
  id = `a-${day}`,
): ActualSession => ({
  id,
  day,
  kind,
  title: 'Entreno',
  durationSec: 2700,
  distanceM: 8000,
});

describe('calendario del plan', () => {
  it('la semana va de lunes a domingo', () => {
    expect(mondayOf('2026-11-12')).toBe('2026-11-09');
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // domingo
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
    expect(weekDays(TODAY)).toHaveLength(7);
    expect(weekDays(TODAY)[6]).toBe('2026-11-15');
  });

  it('calcula la semana ISO, también en el cambio de año', () => {
    expect(isoWeek('2026-11-12')).toBe(46);
    expect(isoWeek('2027-01-01')).toBe(53);
    expect(isoWeek('2027-01-04')).toBe(1);
  });
});

describe('buildWeek', () => {
  const status = (w: ReturnType<typeof buildWeek>, day: string) =>
    w.days.find((d) => d.day === day)!;

  it('clasifica cada día según la fecha y lo hecho', () => {
    const w = buildWeek(
      TODAY,
      TODAY,
      [
        planned('2026-11-09'),
        planned('2026-11-10', { completedAt: new Date() }),
        planned('2026-11-11', { skipped: true }),
        planned('2026-11-12'),
        planned('2026-11-13'),
        planned('2026-11-14', {
          load: 'REST',
          kind: 'OTHER',
          title: 'Descanso',
          plannedDurationMin: null,
        }),
      ],
      [],
    );
    expect(w.days.map((d) => d.status)).toEqual([
      'MISSED',
      'DONE',
      'SKIPPED',
      'TODAY',
      'PLANNED',
      'REST',
      'FREE',
    ]);
    expect(w.isoWeek).toBe(46);
    expect(w.summary).toEqual({
      planned: 5,
      done: 1,
      missed: 1,
      plannedMinutes: 225,
    });
  });

  it('da por hecha la sesión si ese día hay un entreno de la misma disciplina', () => {
    const w = buildWeek(
      TODAY,
      TODAY,
      [planned('2026-11-09')],
      [actual('2026-11-09', 'RUN')],
    );
    const d = status(w, '2026-11-09');
    expect(d).toMatchObject({ status: 'DONE', autoCompleted: true });
    expect(d.actual?.id).toBe('a-2026-11-09');
  });

  it('un entreno de otra disciplina no la cumple', () => {
    const w = buildWeek(
      TODAY,
      TODAY,
      [planned('2026-11-09')],
      [actual('2026-11-09', 'STRENGTH')],
    );
    expect(status(w, '2026-11-09').status).toBe('MISSED');
  });

  it('prefiere el entreno enlazado a mano', () => {
    const w = buildWeek(
      TODAY,
      TODAY,
      [
        planned('2026-11-09', {
          completedAt: new Date(),
          completedSessionId: 'elegido',
        }),
      ],
      [
        actual('2026-11-09', 'RUN', 'otro'),
        actual('2026-11-09', 'RUN', 'elegido'),
      ],
    );
    expect(status(w, '2026-11-09')).toMatchObject({ autoCompleted: false });
    expect(status(w, '2026-11-09').actual?.id).toBe('elegido');
  });

  it('en un día sin plan enseña lo que se entrenó', () => {
    const w = buildWeek(TODAY, TODAY, [], [actual('2026-11-10', 'CYCLE')]);
    expect(status(w, '2026-11-10')).toMatchObject({ status: 'FREE' });
    expect(status(w, '2026-11-10').actual?.kind).toBe('CYCLE');
  });
});

describe('weekDiet', () => {
  const week = weekDays(TODAY).map((day, i) => ({
    day,
    load: (
      ['MEDIUM', 'MEDIUM', 'LOW', 'MEDIUM', 'HIGH', 'REST', 'HIGH'] as const
    )[i],
  }));

  it('redistribuye sin cambiar el total de la semana', () => {
    const diet = weekDiet(week, 2500, 150);
    const total = diet.reduce((s, d) => s + d.kcalTarget, 0);
    expect(Math.abs(total - 7 * 2500)).toBeLessThanOrEqual(4);
    const of = (load: string) => diet.find((d) => d.load === load)!.kcalTarget;
    expect(of('HIGH') - of('REST')).toBe(800);
    expect(of('HIGH')).toBeGreaterThan(2500);
    expect(of('REST')).toBeLessThan(2500);
  });

  it('mantiene la proteína y mueve los hidratos con la carga', () => {
    const diet = weekDiet(week, 2500, 150);
    const high = diet.find((d) => d.load === 'HIGH')!;
    const rest = diet.find((d) => d.load === 'REST')!;
    expect(high.proteinG).toBe(150);
    expect(rest.proteinG).toBe(150);
    expect(high.carbsG).toBeGreaterThan(rest.carbsG);
    // Las kcal de los macros cuadran con el objetivo del día.
    expect(
      Math.abs(
        high.proteinG * 4 + high.carbsG * 4 + high.fatG * 9 - high.kcalTarget,
      ),
    ).toBeLessThan(10);
  });

  it('con todos los días iguales, cada día es la base', () => {
    const flat = weekDiet(
      week.map((d) => ({ ...d, load: 'MEDIUM' as const })),
      2400,
      140,
    );
    expect(flat.every((d) => d.kcalTarget === 2400)).toBe(true);
  });
});

describe('plantillas', () => {
  it('existen las de la semana tipo', () => {
    expect(templateByCode('series')).toMatchObject({
      kind: 'RUN',
      load: 'HIGH',
    });
    expect(templateByCode('nope')).toBeUndefined();
  });
});
