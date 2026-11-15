import { shiftDay } from './calendar';

/** Tipo de la escala de Bristol: 1 (bolitas duras) … 7 (líquida). */
export type BristolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type BowelAmount = 'SMALL' | 'NORMAL' | 'LARGE';
export type BristolCategory = 'HARD' | 'NORMAL' | 'SOFT';
export type DigestionPeriod = 'WEEK' | 'MONTH' | 'YEAR';

export const BOWEL_AMOUNTS: BowelAmount[] = ['SMALL', 'NORMAL', 'LARGE'];

export interface BowelMovement {
  id: string;
  occurredAt: Date;
  /** Día natural (`YYYY-MM-DD`) en la zona del perfil. */
  loggedOn: string;
  bristolType: BristolType;
  amount: BowelAmount;
}

export interface DigestionSummary {
  /** Días que cuenta el periodo (no antes del primer registro). */
  days: number;
  count: number;
  /** Veces al día de media en el periodo. */
  perDay: number;
  /** % de deposiciones de tipo 3 a 5. Null si no hay ninguna. */
  normalPct: number | null;
  /** Veces por tipo: índice 0 = tipo 1. */
  byType: number[];
  /** Días del periodo sin ninguna. */
  daysWithout: number;
}

export function isBristolType(n: number): n is BristolType {
  return Number.isInteger(n) && n >= 1 && n <= 7;
}

/** 1-2 duro (estreñimiento), 3-5 normal, 6-7 blando. */
export function bristolCategory(t: BristolType): BristolCategory {
  return t <= 2 ? 'HARD' : t <= 5 ? 'NORMAL' : 'SOFT';
}

const PERIOD_DAYS: Record<DigestionPeriod, number> = {
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
};

/** Primer día del periodo que acaba hoy (incluido). */
export function periodStart(period: DigestionPeriod, today: string): string {
  return shiftDay(today, -(PERIOD_DAYS[period] - 1));
}

/**
 * Resumen del periodo. Si el primer registro es posterior al inicio del
 * periodo, se cuenta desde ese día: quien empezó ayer no tiene «0,1 al día».
 */
export function digestionSummary(
  entries: BowelMovement[],
  period: DigestionPeriod,
  today: string,
  firstEverDay: string | null,
): DigestionSummary {
  const start = periodStart(period, today);
  const from = firstEverDay && firstEverDay > start ? firstEverDay : start;
  const inRange = entries.filter(
    (e) => e.loggedOn >= from && e.loggedOn <= today,
  );
  const days = firstEverDay ? daysBetween(from, today) + 1 : 0;

  const byType = [0, 0, 0, 0, 0, 0, 0];
  for (const e of inRange) byType[e.bristolType - 1] += 1;
  const normal = byType[2] + byType[3] + byType[4];
  const withSome = new Set(inRange.map((e) => e.loggedOn)).size;

  return {
    days,
    count: inRange.length,
    perDay: days > 0 ? Math.round((inRange.length / days) * 10) / 10 : 0,
    normalPct: inRange.length
      ? Math.round((normal / inRange.length) * 100)
      : null,
    byType,
    daysWithout: Math.max(0, days - withSome),
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000,
  );
}

/** Un día del calendario de Digestión: cuántas veces y qué tipo dominó. */
export interface DigestionDay {
  day: string;
  count: number;
  /** El tipo más repetido ese día; si empatan, el de la última vez. */
  mainType: BristolType;
}

/** Días con alguna deposición, del más antiguo al más reciente. */
export function digestionDays(entries: BowelMovement[]): DigestionDay[] {
  const byDay = new Map<string, BowelMovement[]>();
  for (const e of entries)
    byDay.set(e.loggedOn, [...(byDay.get(e.loggedOn) ?? []), e]);
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => {
      const latestFirst = [...list].sort(
        (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
      );
      const counts = new Map<BristolType, number>();
      for (const e of list)
        counts.set(e.bristolType, (counts.get(e.bristolType) ?? 0) + 1);
      const top = Math.max(...counts.values());
      const mainType = latestFirst.find(
        (e) => counts.get(e.bristolType) === top,
      )!.bristolType;
      return { day, count: list.length, mainType };
    });
}
