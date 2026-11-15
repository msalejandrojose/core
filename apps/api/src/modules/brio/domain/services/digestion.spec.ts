import {
  bristolCategory,
  digestionSummary,
  isBristolType,
  periodStart,
  type BowelMovement,
  type BristolType,
} from './digestion';

const at = (
  day: string,
  t: BristolType,
  id = `${day}-${t}`,
): BowelMovement => ({
  id,
  occurredAt: new Date(`${day}T08:00:00Z`),
  loggedOn: day,
  bristolType: t,
  amount: 'NORMAL',
});

describe('digestión', () => {
  it('clasifica la escala de Bristol', () => {
    expect(
      [1, 2, 3, 5, 6, 7].map((t) => bristolCategory(t as BristolType)),
    ).toEqual(['HARD', 'HARD', 'NORMAL', 'NORMAL', 'SOFT', 'SOFT']);
    expect(isBristolType(0)).toBe(false);
    expect(isBristolType(4)).toBe(true);
    expect(isBristolType(4.5)).toBe(false);
  });

  it('la semana son los 7 días que acaban hoy', () => {
    expect(periodStart('WEEK', '2026-11-15')).toBe('2026-11-09');
  });

  it('resume la semana: veces al día, % normal y días sin', () => {
    const s = digestionSummary(
      [
        at('2026-11-09', 4),
        at('2026-11-10', 4),
        at('2026-11-10', 6, 'b'),
        at('2026-11-12', 2),
        at('2026-11-15', 3),
        at('2026-11-01', 7), // fuera de la semana
      ],
      'WEEK',
      '2026-11-15',
      '2026-10-01',
    );
    expect(s).toEqual({
      days: 7,
      count: 5,
      perDay: 0.7,
      normalPct: 60,
      byType: [0, 1, 1, 2, 0, 1, 0],
      daysWithout: 3,
    });
  });

  it('cuenta desde el primer registro si es reciente', () => {
    const s = digestionSummary(
      [at('2026-11-14', 4), at('2026-11-15', 4)],
      'MONTH',
      '2026-11-15',
      '2026-11-14',
    );
    expect(s.days).toBe(2);
    expect(s.perDay).toBe(1);
  });

  it('sin registros no hay porcentaje', () => {
    expect(digestionSummary([], 'WEEK', '2026-11-15', null)).toMatchObject({
      days: 0,
      count: 0,
      perDay: 0,
      normalPct: null,
    });
  });
});
