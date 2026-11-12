import { create } from 'zustand';
import { formatNumber } from '../format';
import { isoWeek, mondayOf, shiftDay } from '../progress/stats';

/**
 * Plan de ejemplo (lienzo "Plan", "Editar sesión", "Sesión de fuerza", "Dieta y
 * menú", "Lista de la compra"). Ritmo aún no guarda planes: las fechas son las
 * de tu semana real y el objetivo de kcal sale de tu perfil, pero las sesiones,
 * menús y la lista son de ejemplo y lo que editas vive solo en esta sesión.
 */

export type Load = 'Alta' | 'Media' | 'Baja' | 'Descanso';
export type TemplateId = 'fsup' | 'fpie' | 'z2' | 'series' | 'larga' | 'mov' | 'rest';

export const TEMPLATES: Record<TemplateId, { name: string; chip: string; dur: number; load: Load; gym?: boolean }> = {
  fsup: { name: 'Fuerza · tren superior', chip: 'Fuerza superior', dur: 50, load: 'Media', gym: true },
  fpie: { name: 'Fuerza · pierna y core', chip: 'Fuerza pierna', dur: 45, load: 'Media', gym: true },
  z2: { name: 'Rodaje Z2', chip: 'Rodaje Z2', dur: 45, load: 'Media' },
  series: { name: 'Series 6 × 800 m', chip: 'Series', dur: 55, load: 'Alta' },
  larga: { name: 'Tirada larga', chip: 'Tirada larga', dur: 80, load: 'Alta' },
  mov: { name: 'Movilidad', chip: 'Movilidad', dur: 15, load: 'Baja' },
  rest: { name: 'Descanso', chip: 'Descanso', dur: 0, load: 'Descanso' },
};

/** Lo que dice el lienzo de las sesiones ya hechas. */
const DONE_META: Partial<Record<TemplateId, string>> = {
  fsup: '48 min · 17 series · de Hevy',
  z2: '40 min · 6,8 km · 405 kcal',
  mov: '15 min',
};

export const WEEK_TEMPLATE: TemplateId[] = ['fsup', 'z2', 'mov', 'z2', 'series', 'fpie', 'larga'];

export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DAY_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const LOAD_CLASS: Record<Load, string> = {
  Alta: 'plan__load--high',
  Media: 'plan__load--mid',
  Baja: 'plan__load--low',
  Descanso: 'plan__load--rest',
};

export function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
}

export interface WeekDay {
  index: number;
  date: string;
  n: number;
  short: string;
  letter: string;
  full: string;
}

/** Los siete días (lunes a domingo) de la semana de `today`. */
export function weekOf(today: string): { days: WeekDay[]; week: number; range: string; todayIdx: number } {
  const mon = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(mon, i);
    return { index: i, date, n: Number(date.slice(8, 10)), short: DAY_SHORT[i], letter: DAY_LETTER[i], full: DAY_FULL[i] };
  });
  const first = days[0].date;
  const last = days[6].date;
  const m1 = MONTHS[Number(first.slice(5, 7)) - 1];
  const m2 = MONTHS[Number(last.slice(5, 7)) - 1];
  const range = m1 === m2 ? `${days[0].n}–${days[6].n} ${m2}` : `${days[0].n} ${m1} – ${days[6].n} ${m2}`;
  return { days, week: isoWeek(today), range, todayIdx: days.findIndex((d) => d.date === today) };
}

export type DayStatus = 'done' | 'today' | 'planned' | 'rest';

export function statusOf(i: number, todayIdx: number, t: TemplateId): DayStatus {
  if (i === todayIdx) return 'today';
  if (i < todayIdx) return 'done';
  return t === 'rest' || t === 'mov' ? 'rest' : 'planned';
}

export function metaOf(t: TemplateId, status: DayStatus): string {
  const tpl = TEMPLATES[t];
  if (status === 'done' && DONE_META[t]) return DONE_META[t]!;
  if (!tpl.dur) return 'Sin entrenamiento';
  return fmtMinutes(tpl.dur) + (tpl.gym ? ' · rutina lista en Hevy' : tpl.load === 'Alta' ? ' · al reloj' : '');
}

/** kcal extra que suma cada carga sobre tu objetivo base (Dieta y menú). */
export const LOAD_EXTRA: Record<Load, number> = { Alta: 800, Media: 450, Baja: 200, Descanso: 0 };

export const kcal = (n: number) => formatNumber(n);

interface PlanState {
  week: TemplateId[];
  setDay: (i: number, t: TemplateId) => void;
  got: Record<string, boolean>;
  toggleGot: (id: string) => void;
}

export const usePlanStore = create<PlanState>()((set) => ({
  week: WEEK_TEMPLATE,
  setDay: (i, t) => set((s) => ({ week: s.week.map((x, j) => (j === i ? t : x)) })),
  got: { platanos: true, huevos: true, leche: true, avena: true },
  toggleGot: (id) => set((s) => ({ got: { ...s.got, [id]: !s.got[id] } })),
}));
