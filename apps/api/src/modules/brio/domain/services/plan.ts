import type { ActivityKind } from '../entities/performance.entity';
import type {
  ActualSession,
  PlanLoad,
  PlannedSession,
} from '../entities/plan.entity';
import { shiftDay } from './calendar';

/**
 * Plan semanal: plantillas de sesión, estado de cada día y dieta según la
 * carga. Dominio puro.
 */

// ------------------------------ Plantillas --------------------------------

export interface PlanTemplate {
  code: string;
  title: string;
  /** Nombre corto para el selector. */
  short: string;
  kind: ActivityKind;
  load: PlanLoad;
  durationMin: number | null;
  distanceM: number | null;
  structure: Record<string, unknown> | null;
}

/** Sesiones tipo con las que se monta una semana en dos toques. */
export const PLAN_TEMPLATES: readonly PlanTemplate[] = [
  {
    code: 'fsup',
    title: 'Fuerza · tren superior',
    short: 'Fuerza superior',
    kind: 'STRENGTH',
    load: 'MEDIUM',
    durationMin: 50,
    distanceM: null,
    structure: null,
  },
  {
    code: 'fpie',
    title: 'Fuerza · pierna y core',
    short: 'Fuerza pierna',
    kind: 'STRENGTH',
    load: 'MEDIUM',
    durationMin: 45,
    distanceM: null,
    structure: null,
  },
  {
    code: 'z2',
    title: 'Rodaje Z2',
    short: 'Rodaje Z2',
    kind: 'RUN',
    load: 'MEDIUM',
    durationMin: 45,
    distanceM: null,
    structure: null,
  },
  {
    code: 'series',
    title: 'Series 6 × 800 m',
    short: 'Series',
    kind: 'RUN',
    load: 'HIGH',
    durationMin: 55,
    distanceM: null,
    structure: { reps: 6, repDistanceM: 800, recoverySec: 120 },
  },
  {
    code: 'larga',
    title: 'Tirada larga',
    short: 'Tirada larga',
    kind: 'RUN',
    load: 'HIGH',
    durationMin: 80,
    distanceM: null,
    structure: null,
  },
  {
    code: 'bici',
    title: 'Bici suave',
    short: 'Bici',
    kind: 'CYCLE',
    load: 'LOW',
    durationMin: 60,
    distanceM: null,
    structure: null,
  },
  {
    code: 'mov',
    title: 'Movilidad',
    short: 'Movilidad',
    kind: 'OTHER',
    load: 'LOW',
    durationMin: 15,
    distanceM: null,
    structure: null,
  },
  {
    code: 'rest',
    title: 'Descanso',
    short: 'Descanso',
    kind: 'OTHER',
    load: 'REST',
    durationMin: null,
    distanceM: null,
    structure: null,
  },
];

export function templateByCode(code: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((t) => t.code === code);
}

/** Semana tipo (lunes a domingo) para empezar sin plan. */
export const DEFAULT_WEEK: readonly string[] = [
  'fsup',
  'z2',
  'mov',
  'z2',
  'series',
  'fpie',
  'larga',
];

// ------------------------------- Calendario -------------------------------

/** Lunes de la semana de `day`. */
export function mondayOf(day: string): string {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return shiftDay(day, -((dow + 6) % 7));
}

/** Los siete días (lunes a domingo) de la semana de `day`. */
export function weekDays(day: string): string[] {
  const monday = mondayOf(day);
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}

/** Semana ISO 8601 (la que contiene el jueves). */
export function isoWeek(day: string): number {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    )
  );
}

// ------------------------------ Estado del día ----------------------------

export type DayStatus =
  /** Hecha: marcada a mano o con un entreno real de la misma disciplina. */
  | 'DONE'
  /** Es hoy y aún no está hecha. */
  | 'TODAY'
  /** Día futuro con sesión. */
  | 'PLANNED'
  /** Día pasado con sesión sin hacer. */
  | 'MISSED'
  /** Se decidió no hacerla. */
  | 'SKIPPED'
  /** Descanso planificado. */
  | 'REST'
  /** Sin nada planificado. */
  | 'FREE';

export interface WeekDay {
  day: string;
  planned: PlannedSession | null;
  status: DayStatus;
  /** Entreno real que cumple la sesión, o el del día si no había plan. */
  actual: ActualSession | null;
  /** true si la sesión se dio por hecha sola, por un entreno registrado. */
  autoCompleted: boolean;
}

/** Un entreno real cumple una sesión si es de la misma disciplina. */
function matches(planned: PlannedSession, actual: ActualSession): boolean {
  return planned.kind === actual.kind;
}

export function dayStatus(
  planned: PlannedSession | null,
  actuals: ActualSession[],
  day: string,
  today: string,
): Pick<WeekDay, 'status' | 'actual' | 'autoCompleted'> {
  if (!planned) {
    return { status: 'FREE', actual: actuals[0] ?? null, autoCompleted: false };
  }
  if (planned.load === 'REST') {
    return { status: 'REST', actual: actuals[0] ?? null, autoCompleted: false };
  }
  const linked = actuals.find((a) => a.id === planned.completedSessionId);
  const matched = linked ?? actuals.find((a) => matches(planned, a)) ?? null;
  if (planned.completedAt || matched) {
    return {
      status: 'DONE',
      actual: matched,
      autoCompleted: !planned.completedAt,
    };
  }
  if (planned.skipped)
    return { status: 'SKIPPED', actual: null, autoCompleted: false };
  const status: DayStatus =
    day < today ? 'MISSED' : day === today ? 'TODAY' : 'PLANNED';
  return { status, actual: null, autoCompleted: false };
}

export interface WeekSummary {
  /** Sesiones planificadas que no son descanso. */
  planned: number;
  done: number;
  missed: number;
  plannedMinutes: number;
}

export interface WeekView {
  from: string;
  to: string;
  isoWeek: number;
  days: WeekDay[];
  summary: WeekSummary;
}

export function buildWeek(
  day: string,
  today: string,
  planned: PlannedSession[],
  actuals: ActualSession[],
): WeekView {
  const dates = weekDays(day);
  const days = dates.map((date) => {
    const p = planned.find((x) => x.day === date) ?? null;
    return {
      day: date,
      planned: p,
      ...dayStatus(
        p,
        actuals.filter((a) => a.day === date),
        date,
        today,
      ),
    };
  });
  const sessions = days.filter((d) => d.planned && d.planned.load !== 'REST');
  return {
    from: dates[0],
    to: dates[6],
    isoWeek: isoWeek(day),
    days,
    summary: {
      planned: sessions.length,
      done: sessions.filter((d) => d.status === 'DONE').length,
      missed: sessions.filter((d) => d.status === 'MISSED').length,
      plannedMinutes: sessions.reduce(
        (m, d) => m + (d.planned?.plannedDurationMin ?? 0),
        0,
      ),
    },
  };
}

// --------------------------------- Dieta ----------------------------------

/** kcal que pide de más cada carga respecto a un día de descanso. */
export const LOAD_EXTRA_KCAL: Record<PlanLoad, number> = {
  REST: 0,
  LOW: 200,
  MEDIUM: 450,
  HIGH: 800,
};
/** Parte de las kcal del día que va a grasa. */
const FAT_SHARE = 0.25;

export interface DayDiet {
  day: string;
  load: PlanLoad;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Reparte las calorías de la semana según la carga de cada día.
 *
 * El objetivo diario del perfil ya incluye tu actividad media, así que no se
 * SUMA nada: se redistribuye. Cada día recibe la base más su extra menos el
 * extra medio de la semana, de modo que la semana suma exactamente 7 × base.
 * Los días duros comen más y los de descanso menos.
 *
 * Macros: proteína fija (la del perfil), 25 % de las kcal en grasa y el resto
 * en hidratos, que es lo que sube y baja con la carga.
 */
export function weekDiet(
  days: { day: string; load: PlanLoad }[],
  baseKcal: number,
  proteinG: number,
): DayDiet[] {
  const meanExtra =
    days.reduce((s, d) => s + LOAD_EXTRA_KCAL[d.load], 0) / (days.length || 1);
  return days.map(({ day, load }) => {
    const kcalTarget = Math.round(baseKcal + LOAD_EXTRA_KCAL[load] - meanExtra);
    const fatG = Math.round((kcalTarget * FAT_SHARE) / 9);
    const carbsG = Math.max(
      0,
      Math.round((kcalTarget - proteinG * 4 - fatG * 9) / 4),
    );
    return {
      day,
      load,
      kcalTarget,
      proteinG: Math.round(proteinG),
      carbsG,
      fatG,
    };
  });
}
