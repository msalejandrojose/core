/**
 * Celdas del calendario de Digestión a partir de los días con alguna
 * deposición. Funciones puras (fechas `YYYY-MM-DD` en UTC) y testeadas.
 */

export interface DayMark {
  day: string;
  count: number;
  mainType: number;
}

export interface CalendarCell {
  /** Clave estable: el día, el mes (`YYYY-MM`) o `pad-N` para huecos. */
  key: string;
  /** Texto pequeño: número del día, inicial del día de la semana o del mes. */
  label: string;
  /** Null en huecos de alineación. */
  count: number | null;
  mainType: number | null;
  isToday?: boolean;
}

const WEEKDAY = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const toDate = (d: string) => new Date(`${d}T12:00:00Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: string, n: number) => toDay(new Date(toDate(d).getTime() + n * 86_400_000));
/** 0 = lunes … 6 = domingo. */
const weekday = (d: string) => (toDate(d).getUTCDay() + 6) % 7;

function byDay(marks: DayMark[]) {
  return new Map(marks.map((m) => [m.day, m]));
}

/** Los 7 días que acaban hoy, con su inicial y número. */
export function weekCells(marks: DayMark[], today: string): CalendarCell[] {
  const map = byDay(marks);
  return Array.from({ length: 7 }, (_, i) => {
    const day = shift(today, i - 6);
    const m = map.get(day);
    return {
      key: day,
      label: `${WEEKDAY[weekday(day)]} ${Number(day.slice(8))}`,
      count: m?.count ?? 0,
      mainType: m?.mainType ?? null,
      isToday: day === today,
    };
  });
}

/** Los 30 días que acaban hoy, alineados por semanas (lunes a domingo). */
export function monthCells(marks: DayMark[], today: string): CalendarCell[] {
  const map = byDay(marks);
  const start = shift(today, -29);
  const pad = Array.from({ length: weekday(start) }, (_, i) => ({
    key: `pad-${i}`,
    label: '',
    count: null,
    mainType: null,
  }));
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = shift(start, i);
    const m = map.get(day);
    return {
      key: day,
      label: String(Number(day.slice(8))),
      count: m?.count ?? 0,
      mainType: m?.mainType ?? null,
      isToday: day === today,
    };
  });
  return [...pad, ...days];
}

/** Los 12 meses que acaban este mes: veces en el mes y el tipo que más se repitió. */
export function yearCells(marks: DayMark[], today: string): CalendarCell[] {
  const [y, mo] = today.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(y, mo - 1 - (11 - i), 1));
    const key = date.toISOString().slice(0, 7);
    const inMonth = marks.filter((m) => m.day.startsWith(key));
    const byType = new Map<number, number>();
    for (const m of inMonth) byType.set(m.mainType, (byType.get(m.mainType) ?? 0) + m.count);
    let mainType: number | null = null;
    let best = 0;
    for (const [t, n] of byType) if (n > best) [mainType, best] = [t, n];
    return {
      key,
      label: MONTH[date.getUTCMonth()],
      count: inMonth.reduce((s, m) => s + m.count, 0),
      mainType,
      isToday: key === today.slice(0, 7),
    };
  });
}
