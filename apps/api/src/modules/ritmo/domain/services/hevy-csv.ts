// Lectura del CSV que exporta Hevy (Ajustes → Exportar datos → entrenos).
// Una fila por serie: "title","start_time","end_time","description",
// "exercise_title","superset_id","exercise_notes","set_index","set_type",
// "weight_kg","reps","distance_km","duration_seconds","rpe". Las fechas van en
// el idioma de la app ("17 nov 2026, 07:12" o "17 Nov 2026, 07:12") y en la
// hora local de quien entrena.
import { zonedTimeToUtc } from './calendar';
import type { HevyWorkout } from './hevy';

export const MAX_CSV_BYTES = 5 * 1024 * 1024;

/** Filas de un CSV (RFC 4180: comillas, comillas dobles y saltos de línea dentro). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const MONTHS: Record<string, number> = {
  ene: 1,
  jan: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dic: 12,
  dec: 12,
};

/**
 * Instante de una fecha del CSV de Hevy en la zona del usuario. Admite
 * "17 nov 2026, 07:12", "Nov 17, 2026, 07:12" y "2026-11-17 07:12". null si
 * no se entiende.
 */
export function parseHevyDate(raw: string, timeZone: string): Date | null {
  const s = raw.trim().toLowerCase().replace(/\./g, '');
  let m = /^(\d{1,2}) ([a-z]+),? (\d{4}),? (\d{1,2}):(\d{2})$/.exec(s);
  let parts: [number, string, number, number, number] | null = m
    ? [Number(m[1]), m[2], Number(m[3]), Number(m[4]), Number(m[5])]
    : null;
  if (!parts) {
    m = /^([a-z]+) (\d{1,2}),? (\d{4}),? (\d{1,2}):(\d{2})$/.exec(s);
    if (m)
      parts = [Number(m[2]), m[1], Number(m[3]), Number(m[4]), Number(m[5])];
  }
  if (!parts) {
    m = /^(\d{4})-(\d{2})-(\d{2})[ t](\d{2}):(\d{2})/.exec(s);
    if (!m) return null;
    return zonedTimeToUtc(
      { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5] },
      timeZone,
    );
  }
  const [day, monthName, year, hour, minute] = parts;
  const month = MONTHS[monthName] ?? MONTHS[monthName.slice(0, 3)];
  if (!month || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return zonedTimeToUtc({ year, month, day, hour, minute }, timeZone);
}

const num = (s: string | undefined): number | null => {
  if (s === undefined || s.trim() === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Identificador estable de un ejercicio del CSV: su nombre, sin mayúsculas ni espacios de más. */
export const csvExerciseKey = (title: string) =>
  `csv:${title.trim().replace(/\s+/g, ' ').toLowerCase()}`;

export interface HevyCsvResult {
  /** Entrenos con la forma de la API de Hevy, para pasar por el mismo importador. */
  workouts: HevyWorkout[];
  /** Nombre (tal cual) de cada ejercicio, por su clave. */
  exerciseTitles: Map<string, string>;
  /** Series que solo tienen tiempo o distancia (plancha, estiramientos): no se importan. */
  timeOnlySets: number;
  /** Filas que no se han podido leer (fecha rara, sin ejercicio…). */
  badRows: number;
}

export class HevyCsvFormatError extends Error {
  constructor() {
    super('RITMO_HEVY_CSV_INVALID');
  }
}

/**
 * Entrenos del CSV de Hevy. Un entreno = mismo título y misma hora de inicio.
 * Los ejercicios van en el orden del archivo; si uno vuelve a salir más tarde
 * en el mismo entreno, es un bloque nuevo.
 */
export function workoutsFromHevyCsv(
  text: string,
  timeZone: string,
): HevyCsvResult {
  const [header, ...rows] = parseCsv(text);
  const col = new Map(
    (header ?? []).map((h, i) => [h.trim().toLowerCase(), i]),
  );
  for (const needed of [
    'title',
    'start_time',
    'exercise_title',
    'reps',
    'weight_kg',
  ])
    if (!col.has(needed)) throw new HevyCsvFormatError();
  const get = (r: string[], k: string) => {
    const i = col.get(k);
    return i === undefined ? '' : (r[i] ?? '');
  };

  const byKey = new Map<string, HevyWorkout>();
  const exerciseTitles = new Map<string, string>();
  let timeOnlySets = 0;
  let badRows = 0;

  for (const r of rows) {
    const title = get(r, 'title').trim() || 'Entreno';
    const startRaw = get(r, 'start_time');
    const exTitle = get(r, 'exercise_title').trim();
    const start = parseHevyDate(startRaw, timeZone);
    if (!start || !exTitle) {
      badRows += 1;
      continue;
    }
    const end = parseHevyDate(get(r, 'end_time'), timeZone) ?? start;
    const id = `${start.toISOString()}|${title}`;
    let w = byKey.get(id);
    if (!w) {
      w = {
        id,
        title,
        description: get(r, 'description').trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        exercises: [],
      };
      byKey.set(id, w);
    }
    const key = csvExerciseKey(exTitle);
    exerciseTitles.set(key, exTitle.replace(/\s+/g, ' '));
    let ex = w.exercises[w.exercises.length - 1];
    if (!ex || ex.exercise_template_id !== key) {
      ex = {
        index: w.exercises.length,
        title: exTitle,
        exercise_template_id: key,
        sets: [],
      };
      w.exercises.push(ex);
    }
    const reps = num(get(r, 'reps'));
    if (!reps || reps <= 0) {
      if (num(get(r, 'duration_seconds')) || num(get(r, 'distance_km')))
        timeOnlySets += 1;
      else badRows += 1;
      continue;
    }
    const type = get(r, 'set_type').trim().toLowerCase();
    ex.sets.push({
      index: num(get(r, 'set_index')) ?? ex.sets.length,
      type: type === 'warmup' ? 'warmup' : 'normal',
      weight_kg: num(get(r, 'weight_kg')),
      reps,
      rpe: num(get(r, 'rpe')),
    });
  }

  const workouts = [...byKey.values()]
    .map((w) => ({ ...w, exercises: w.exercises.filter((e) => e.sets.length) }))
    .filter((w) => w.exercises.length)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  return { workouts, exerciseTitles, timeOnlySets, badRows };
}
