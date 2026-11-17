import type { HevyExercise, HevySet, HevyWorkout } from './hevy';

/**
 * Lee el CSV que exporta Hevy (Perfil › Ajustes › Exportar e importar datos ›
 * Exportar entrenos) y lo convierte en los mismos `HevyWorkout` que da su API,
 * para importarlo igual. Una fila por serie; columnas habituales:
 * title, start_time, end_time, description, exercise_title, superset_id,
 * exercise_notes, set_index, set_type, weight_kg | weight_lbs, reps,
 * distance_km | distance_miles, duration_seconds, rpe.
 *
 * Las fechas vienen en hora local sin zona («16 Nov 2026, 18:30»): se
 * interpretan en la zona horaria de la persona. Puro, sin red ni base de datos.
 */

/** Separa un CSV respetando comillas («a, b», comillas dobladas, saltos dentro). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  ene: 1,
  abr: 4,
  ago: 8,
  dic: 12,
};

/** Minutos que la zona va por delante de UTC en ese instante (Madrid en verano: 120). */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - utcMs) / 60000);
}

/**
 * «16 Nov 2026, 18:30» (o «2026-11-16 18:30», o ISO con zona) → instante UTC,
 * leyendo la hora local en `timeZone`. null si no se entiende.
 */
export function parseHevyDate(value: string, timeZone: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)))
    return new Date(v);
  let y: number, mo: number, d: number, h: number, mi: number;
  let m =
    /^(\d{1,2})\s+([A-Za-zé]{3})[a-z]*\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(
      v,
    );
  if (m) {
    const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (!month) return null;
    [d, mo, y, h, mi] = [
      Number(m[1]),
      month,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
    ];
  } else {
    m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(v);
    if (!m) return null;
    [y, mo, d, h, mi] = [
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
    ];
  }
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  // Dos pasadas para acertar también en el día del cambio de hora.
  let utc = naive - offsetMinutes(naive, timeZone) * 60000;
  utc = naive - offsetMinutes(utc, timeZone) * 60000;
  return new Date(utc);
}

const LB = 0.45359237;
const MILE = 1609.344;

const num = (v: string | undefined) => {
  if (v == null || v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Id estable de un entreno del CSV: reimportar el mismo archivo no duplica. */
export function csvWorkoutId(title: string, start: Date): string {
  const base = `${start.toISOString()}|${title.trim().toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < base.length; i += 1)
    h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  return `csv-${start.getTime()}-${(h >>> 0).toString(36)}`;
}

/** Id de «plantilla» de un ejercicio del CSV: su nombre (Hevy no lo exporta con id). */
export const csvTemplateId = (title: string) =>
  `csv:${title.trim().toLowerCase()}`;

export interface HevyCsvResult {
  workouts: HevyWorkout[];
  /** Filas que no se pudieron leer (fecha rara, sin ejercicio…). */
  skippedRows: number;
}

export function parseHevyCsv(text: string, timeZone: string): HevyCsvResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { workouts: [], skippedRows: 0 };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const need = ['title', 'start_time', 'exercise_title'];
  if (need.some((n) => col(n) < 0)) throw new Error('HEVY_CSV_FORMAT');

  const at = (r: string[], name: string) => {
    const i = col(name);
    return i >= 0 ? (r[i] ?? '') : '';
  };
  const byId = new Map<string, HevyWorkout>();
  let skippedRows = 0;

  for (const r of rows.slice(1)) {
    const title = at(r, 'title').trim() || 'Entreno de Hevy';
    const start = parseHevyDate(at(r, 'start_time'), timeZone);
    const exerciseTitle = at(r, 'exercise_title').trim();
    if (!start || !exerciseTitle) {
      skippedRows += 1;
      continue;
    }
    const end =
      parseHevyDate(at(r, 'end_time'), timeZone) ??
      new Date(start.getTime() + 60 * 60000);
    const id = csvWorkoutId(title, start);
    let w = byId.get(id);
    if (!w) {
      w = {
        id,
        title,
        description: at(r, 'description').trim() || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        routine_id: null,
        exercises: [],
      };
      byId.set(id, w);
    }
    const templateId = csvTemplateId(exerciseTitle);
    // Un ejercicio nuevo empieza cuando cambia el nombre respecto a la fila anterior.
    let ex: HevyExercise | undefined = w.exercises[w.exercises.length - 1];
    if (!ex || ex.exercise_template_id !== templateId) {
      ex = {
        index: w.exercises.length,
        title: exerciseTitle,
        exercise_template_id: templateId,
        sets: [],
      };
      w.exercises.push(ex);
    }
    const lbs = num(at(r, 'weight_lbs'));
    const weightKg =
      col('weight_kg') >= 0
        ? num(at(r, 'weight_kg'))
        : lbs != null
          ? lbs * LB
          : null;
    const km = num(at(r, 'distance_km'));
    const miles = num(at(r, 'distance_miles'));
    const set: HevySet = {
      index: num(at(r, 'set_index')) ?? ex.sets.length,
      type: at(r, 'set_type').trim() || 'normal',
      weight_kg: weightKg,
      reps: num(at(r, 'reps')),
      rpe: num(at(r, 'rpe')),
      distance_meters:
        km != null ? km * 1000 : miles != null ? miles * MILE : null,
      duration_seconds: num(at(r, 'duration_seconds')),
    };
    ex.sets.push(set);
  }
  return { workouts: [...byId.values()], skippedRows };
}
