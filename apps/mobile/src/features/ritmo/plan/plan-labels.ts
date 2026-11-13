import type { DayStatus, PlanDay, PlanLoad } from './plan.api';
import { formatNumber } from '../format';

/** Textos y formatos de las pantallas de Plan. */

export const LOAD_LABEL: Record<PlanLoad, string> = { REST: 'Descanso', LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' };
export const LOAD_CLASS: Record<PlanLoad, string> = {
  HIGH: 'plan__load--high',
  MEDIUM: 'plan__load--mid',
  LOW: 'plan__load--low',
  REST: 'plan__load--rest',
};
export const STATUS_TEXT: Record<DayStatus, string> = {
  DONE: 'Hecha',
  TODAY: 'Hoy',
  PLANNED: 'Pendiente',
  MISSED: 'Sin hacer',
  SKIPPED: 'Saltada',
  REST: 'Descanso',
  FREE: 'Sin plan',
};

const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Índice del día de la semana, con el lunes como 0. */
const dow = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
export const dayNumber = (day: string) => Number(day.slice(8, 10));
export const dayShort = (day: string) => DAY_SHORT[dow(day)];
export const dayLetter = (day: string) => DAY_LETTER[dow(day)];
export const dayFull = (day: string) => DAY_FULL[dow(day)];

/** "9–15 nov" o "30 nov – 6 dic". */
export function weekRange(from: string, to: string): string {
  const m1 = MONTHS[Number(from.slice(5, 7)) - 1];
  const m2 = MONTHS[Number(to.slice(5, 7)) - 1];
  return m1 === m2 ? `${dayNumber(from)}–${dayNumber(to)} ${m2}` : `${dayNumber(from)} ${m1} – ${dayNumber(to)} ${m2}`;
}

export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
}

/** Línea de detalle de un día: lo hecho de verdad si lo hay; si no, lo planificado. */
export function dayMeta(d: PlanDay): string {
  if (d.actual && (d.status === 'DONE' || d.status === 'FREE' || d.status === 'REST')) {
    const parts = [fmtMinutes(Math.round(d.actual.durationSec / 60))];
    if (d.actual.distanceM) parts.push(`${formatNumber(d.actual.distanceM / 1000, 1)} km`);
    parts.push(d.status === 'DONE' ? (d.autoCompleted ? 'registrado' : 'hecha') : d.actual.title);
    return parts.join(' · ');
  }
  const p = d.planned;
  if (!p) return 'Nada planificado';
  if (p.load === 'REST') return 'Sin entrenamiento';
  const parts: string[] = [];
  if (p.plannedDurationMin) parts.push(fmtMinutes(p.plannedDurationMin));
  if (p.plannedDistanceM) parts.push(`${formatNumber(p.plannedDistanceM / 1000, 1)} km`);
  if (p.startTime) parts.push(p.startTime);
  if (d.status === 'DONE') parts.push('hecha');
  if (d.status === 'MISSED') parts.push('sin hacer');
  if (d.status === 'SKIPPED') parts.push('saltada');
  return parts.join(' · ') || 'Sesión planificada';
}
