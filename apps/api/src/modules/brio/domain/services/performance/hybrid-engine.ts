import {
  LOWER_BODY_MUSCLES,
  type ActivityKind,
  type Exercise,
  type TrainingSession,
} from '../../entities/performance.entity';
import { isCardio, type CardioPlateau } from './cardio-engine';
import { isDemanding, sessionLoad, sessionRpe } from './fatigue-engine';
import { daysBetween, median, pearson, round, sum } from './stats';
import type { StrengthAnalysis } from './strength-engine';

/**
 * HybridEngine: cómo conviven la fuerza y el cardio.
 *
 * Cruza las dos disciplinas, pero no las suma: kilos, kilómetros y series no
 * son comparables. Lo único que se agrega entre disciplinas es la carga por
 * Session RPE (RPE × minutos), que mide lo mismo en las dos. Todo lo que aquí
 * relaciona una cosa con otra es una CORRELACIÓN observada en tus datos: puede
 * tener otras explicaciones y no demuestra que una cause la otra.
 */

// ------------------------------ Equilibrio --------------------------------

/** Días que se miran para el reparto entre disciplinas si no se pide otro periodo. */
export const BALANCE_DAYS = 28;
/** Días sin una disciplina a partir de los cuales se señala su ausencia. */
const ABSENCE_DAYS = 14;
/** Proporción de sesiones exigentes a partir de la cual se señala. */
const MOSTLY_HARD_SHARE = 0.4;

export type BalanceFlag =
  | 'NO_CARDIO'
  | 'NO_STRENGTH'
  | 'MOSTLY_HARD'
  | 'NO_EASY_SESSIONS';

export interface DisciplineBalance {
  windowDays: number;
  strength: { sessions: number; minutes: number; load: number };
  cardio: { sessions: number; minutes: number; load: number };
  /** Parte del tiempo dedicada a fuerza (0–1); null sin sesiones. */
  strengthTimeShare: number | null;
  /** Parte de la carga (RPE × min) que es de fuerza (0–1). */
  strengthLoadShare: number | null;
  /** Sesiones por intensidad: fácil (RPE ≤ 4), media (5–7), exigente (≥ 8). */
  intensity: { easy: number; moderate: number; hard: number; unknown: number };
  daysSinceStrength: number | null;
  daysSinceCardio: number | null;
  flags: BalanceFlag[];
}

function balance(
  sessions: TrainingSession[],
  today: string,
  windowDays: number,
): DisciplineBalance {
  const recent = sessions.filter((s) => {
    const age = daysBetween(s.day, today);
    return age >= 0 && age < windowDays;
  });
  const part = (items: TrainingSession[]) => ({
    sessions: items.length,
    minutes: Math.round(sum(items.map((s) => s.durationSec)) / 60),
    load: sum(items.map((s) => sessionLoad(s) ?? 0)),
  });
  const strength = part(recent.filter((s) => s.kind === 'STRENGTH'));
  const cardio = part(recent.filter((s) => isCardio(s.kind)));
  const share = (a: number, b: number) =>
    a + b > 0 ? round(a / (a + b), 2) : null;

  const intensity = { easy: 0, moderate: 0, hard: 0, unknown: 0 };
  for (const s of recent) {
    const rpe = sessionRpe(s)?.value;
    if (rpe === undefined) intensity.unknown += 1;
    else if (rpe >= 8) intensity.hard += 1;
    else if (rpe >= 5) intensity.moderate += 1;
    else intensity.easy += 1;
  }
  const since = (match: (s: TrainingSession) => boolean) => {
    const last = sessions
      .filter((s) => match(s) && daysBetween(s.day, today) >= 0)
      .reduce<
        string | null
      >((d, s) => (d === null || s.day > d ? s.day : d), null);
    return last ? daysBetween(last, today) : null;
  };
  const daysSinceStrength = since((s) => s.kind === 'STRENGTH');
  const daysSinceCardio = since((s) => isCardio(s.kind));
  const known = intensity.easy + intensity.moderate + intensity.hard;

  const flags: BalanceFlag[] = [];
  // Solo se señala la ausencia de una disciplina si la otra sí se entrena.
  if (
    strength.sessions > 0 &&
    (daysSinceCardio === null || daysSinceCardio >= ABSENCE_DAYS)
  ) {
    flags.push('NO_CARDIO');
  }
  if (
    cardio.sessions > 0 &&
    (daysSinceStrength === null || daysSinceStrength >= ABSENCE_DAYS)
  ) {
    flags.push('NO_STRENGTH');
  }
  if (known >= 5 && intensity.hard / known > MOSTLY_HARD_SHARE)
    flags.push('MOSTLY_HARD');
  if (known >= 6 && intensity.easy === 0) flags.push('NO_EASY_SESSIONS');

  return {
    windowDays,
    strength,
    cardio,
    strengthTimeShare: share(strength.minutes, cardio.minutes),
    strengthLoadShare: share(strength.load, cardio.load),
    intensity,
    daysSinceStrength,
    daysSinceCardio,
    flags,
  };
}

// ---------------------------- Tren inferior --------------------------------

/** Disciplinas de cardio que cargan sobre todo las piernas. */
const LEG_CARDIO: readonly ActivityKind[] = ['RUN', 'CYCLE', 'HIKE'];
/** Series ponderadas de pierna a partir de las cuales una sesión es «de pierna». */
const LEG_SESSION_SETS = 4;
/** Duración (s) a partir de la cual un cardio de piernas cuenta como exigente. */
const LONG_CARDIO_SEC = 60 * 60;
/** Horas entre dos esfuerzos de pierna por debajo de las cuales se listan. */
const CLOSE_HOURS = 36;
const LOWER_WINDOW_DAYS = 14;

export interface LowerBodyEvent {
  sessionId: string;
  day: string;
  type: 'STRENGTH_LEGS' | 'RUN' | 'CYCLE' | 'HIKE';
  /** Exigente: pierna en fuerza, o cardio duro (RPE ≥ 8) o de una hora o más. */
  demanding: boolean;
  /** Series ponderadas de pierna (fuerza) o minutos (cardio). */
  amount: number;
}

export interface LowerBodyLoad {
  windowDays: number;
  events: LowerBodyEvent[];
  demandingLast7: number;
  /** Racha más larga de días seguidos con un esfuerzo exigente de pierna. */
  maxConsecutiveDemandingDays: number;
  /** Pares de esfuerzos exigentes con menos de 36 h entre ellos. */
  closePairs: {
    first: string;
    second: string;
    hoursApart: number;
    mixed: boolean;
  }[];
}

function legSets(s: TrainingSession, byId: Map<string, Exercise>): number {
  let total = 0;
  for (const set of s.sets) {
    if (set.isWarmup) continue;
    for (const m of byId.get(set.exerciseId)?.muscles ?? []) {
      if (LOWER_BODY_MUSCLES.includes(m.muscle)) total += m.weight;
    }
  }
  return total;
}

function lowerBody(
  sessions: TrainingSession[],
  exercises: Exercise[],
  today: string,
): LowerBodyLoad {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const recent = sessions
    .filter((s) => {
      const age = daysBetween(s.day, today);
      return age >= 0 && age < LOWER_WINDOW_DAYS;
    })
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  const found: { s: TrainingSession; e: LowerBodyEvent }[] = [];
  for (const s of recent) {
    if (s.kind === 'STRENGTH') {
      const sets = legSets(s, byId);
      if (sets >= LEG_SESSION_SETS) {
        found.push({
          s,
          e: {
            sessionId: s.id,
            day: s.day,
            type: 'STRENGTH_LEGS',
            demanding: true,
            amount: round(sets, 1),
          },
        });
      }
    } else if (LEG_CARDIO.includes(s.kind)) {
      found.push({
        s,
        e: {
          sessionId: s.id,
          day: s.day,
          type: s.kind as 'RUN' | 'CYCLE' | 'HIKE',
          demanding: isDemanding(s) || s.durationSec >= LONG_CARDIO_SEC,
          amount: Math.round(s.durationSec / 60),
        },
      });
    }
  }

  const hard = found.filter((f) => f.e.demanding);
  const days = [...new Set(hard.map((f) => f.e.day))].sort();
  let streak = 0;
  let maxStreak = 0;
  days.forEach((d, i) => {
    streak = i > 0 && daysBetween(days[i - 1], d) === 1 ? streak + 1 : 1;
    maxStreak = Math.max(maxStreak, streak);
  });
  const closePairs: LowerBodyLoad['closePairs'] = [];
  hard.forEach((f, i) => {
    if (i === 0) return;
    const prev = hard[i - 1];
    const hours =
      (f.s.startedAt.getTime() -
        (prev.s.startedAt.getTime() + prev.s.durationSec * 1000)) /
      3_600_000;
    if (hours < CLOSE_HOURS) {
      closePairs.push({
        first: prev.e.sessionId,
        second: f.e.sessionId,
        hoursApart: round(Math.max(0, hours), 1),
        mixed:
          (prev.e.type === 'STRENGTH_LEGS') !== (f.e.type === 'STRENGTH_LEGS'),
      });
    }
  });

  return {
    windowDays: LOWER_WINDOW_DAYS,
    events: found.map((f) => f.e),
    demandingLast7: hard.filter((f) => daysBetween(f.e.day, today) < 7).length,
    maxConsecutiveDemandingDays: maxStreak,
    closePairs,
  };
}

// ----------------------------- Interferencia ------------------------------

const INTERFERENCE_WEEKS = 12;
/** Semanas con dato en las dos series que hacen falta para correlacionar. */
const MIN_PAIRED_WEEKS = 6;
/** |r| a partir del cual se habla de asociación. */
const ASSOCIATION_R = 0.5;

export type Association =
  | 'NEGATIVE'
  | 'NONE'
  | 'POSITIVE'
  | 'INSUFFICIENT_DATA';

export interface WeekPoint {
  /** Semanas hacia atrás (0 = los últimos 7 días). */
  weeksAgo: number;
  strengthLoad: number;
  cardioLoad: number;
  /** Rendimiento de fuerza de la semana respecto a tu mediana (1 = lo habitual). */
  strengthPerf: number | null;
  /** Velocidad en carrera de la semana respecto a tu mediana (1 = lo habitual). */
  cardioPerf: number | null;
}

export interface Correlation {
  /** r de Pearson; null si no hay semanas suficientes. */
  r: number | null;
  pairedWeeks: number;
  association: Association;
}

export interface Interference {
  weeks: WeekPoint[];
  /** Carga de cardio de la semana frente al rendimiento de fuerza de esa semana. */
  cardioLoadVsStrengthPerf: Correlation;
  /** Carga de fuerza de la semana frente al rendimiento en carrera de esa semana. */
  strengthLoadVsCardioPerf: Correlation;
  /** Otras explicaciones posibles, para leer el dato con cuidado. */
  caveats: string[];
}

function correlate(pairs: [number, number][]): Correlation {
  if (pairs.length < MIN_PAIRED_WEEKS) {
    return {
      r: null,
      pairedWeeks: pairs.length,
      association: 'INSUFFICIENT_DATA',
    };
  }
  const r = pearson(
    pairs.map((p) => p[0]),
    pairs.map((p) => p[1]),
  );
  return {
    r: r === null ? null : round(r, 2),
    pairedWeeks: pairs.length,
    association:
      r === null
        ? 'INSUFFICIENT_DATA'
        : r <= -ASSOCIATION_R
          ? 'NEGATIVE'
          : r >= ASSOCIATION_R
            ? 'POSITIVE'
            : 'NONE',
  };
}

function interference(
  sessions: TrainingSession[],
  strength: StrengthAnalysis,
  today: string,
): Interference {
  const weekOf = (day: string) => Math.floor(daysBetween(day, today) / 7);
  const inRange = (day: string) => {
    const age = daysBetween(day, today);
    return age >= 0 && age < INTERFERENCE_WEEKS * 7;
  };

  // Fuerza: e1RM de cada sesión respecto a la mediana del propio ejercicio.
  const strengthRatios = new Map<number, number[]>();
  for (const ex of strength.exercises) {
    const values = ex.history.flatMap((p) => (p.e1rm === null ? [] : [p.e1rm]));
    const base = median(values);
    if (!base || values.length < 3) continue;
    for (const p of ex.history) {
      if (p.e1rm === null || !inRange(p.day)) continue;
      const w = weekOf(p.day);
      strengthRatios.set(w, [...(strengthRatios.get(w) ?? []), p.e1rm / base]);
    }
  }
  // Cardio: velocidad de las carreras respecto a su mediana.
  const runs = sessions.filter(
    (s) => s.kind === 'RUN' && s.distanceM && s.durationSec >= 20 * 60,
  );
  const speed = (s: TrainingSession) => s.distanceM! / s.durationSec;
  const baseSpeed = median(runs.map(speed));
  const cardioRatios = new Map<number, number[]>();
  if (baseSpeed && runs.length >= 3) {
    for (const s of runs) {
      if (!inRange(s.day)) continue;
      const w = weekOf(s.day);
      cardioRatios.set(w, [
        ...(cardioRatios.get(w) ?? []),
        speed(s) / baseSpeed,
      ]);
    }
  }

  const weeks: WeekPoint[] = Array.from(
    { length: INTERFERENCE_WEEKS },
    (_, i) => {
      const weeksAgo = INTERFERENCE_WEEKS - 1 - i;
      const mine = sessions.filter(
        (s) => inRange(s.day) && weekOf(s.day) === weeksAgo,
      );
      const load = (match: (s: TrainingSession) => boolean) =>
        sum(mine.filter(match).map((s) => sessionLoad(s) ?? 0));
      const perf = (m: Map<number, number[]>) => {
        const v = median(m.get(weeksAgo) ?? []);
        return v === null ? null : round(v, 3);
      };
      return {
        weeksAgo,
        strengthLoad: load((s) => s.kind === 'STRENGTH'),
        cardioLoad: load((s) => isCardio(s.kind)),
        strengthPerf: perf(strengthRatios),
        cardioPerf: perf(cardioRatios),
      };
    },
  );

  const pairs = (load: keyof WeekPoint, perf: keyof WeekPoint) =>
    weeks.flatMap((w): [number, number][] =>
      w[perf] === null ? [] : [[w[load] as number, w[perf]]],
    );

  return {
    weeks,
    cardioLoadVsStrengthPerf: correlate(pairs('cardioLoad', 'strengthPerf')),
    strengthLoadVsCardioPerf: correlate(pairs('strengthLoad', 'cardioPerf')),
    caveats: [
      'Es una correlación entre semanas, no una prueba de que una cosa cause la otra.',
      'Sueño, estrés, alimentación, calor o una semana de descarga pueden explicar lo mismo.',
      'Con pocas semanas, una sola semana rara cambia el resultado.',
    ],
  };
}

// ------------------------------ Evolución ----------------------------------

export type DisciplineTrend = 'UP' | 'STABLE' | 'DOWN' | 'INSUFFICIENT_DATA';

export type HybridVerdict =
  | 'BOTH_PROGRESSING'
  | 'STRENGTH_UP_CARDIO_DOWN'
  | 'CARDIO_UP_STRENGTH_DOWN'
  | 'STRENGTH_UP_CARDIO_FLAT'
  | 'CARDIO_UP_STRENGTH_FLAT'
  | 'BOTH_STALLED'
  | 'BOTH_DECLINING'
  | 'ONE_DECLINING'
  | 'INSUFFICIENT_DATA';

export interface HybridEvolution {
  strength: {
    trend: DisciplineTrend;
    /** Mediana del cambio (%) de los ejercicios con datos suficientes. */
    changePct: number | null;
    exercisesUsed: number;
  };
  cardio: {
    trend: DisciplineTrend;
    changePct: number | null;
    /** Disciplina usada (la que más sesiones comparables tiene). */
    kind: ActivityKind | null;
  };
  verdict: HybridVerdict;
}

function evolution(
  strength: StrengthAnalysis,
  cardioPlateaus: CardioPlateau[],
): HybridEvolution {
  const judged = strength.exercises.filter(
    (e) => e.plateau.status !== 'INSUFFICIENT_DATA',
  );
  const sChange = median(
    judged.flatMap((e) =>
      e.plateau.evidence.changePct === null
        ? []
        : [e.plateau.evidence.changePct],
    ),
  );
  const count = (status: string) =>
    judged.filter((e) => e.plateau.status === status).length;
  // La tendencia de fuerza es la del estado mayoritario entre los ejercicios.
  const sTrend: DisciplineTrend = !judged.length
    ? 'INSUFFICIENT_DATA'
    : count('PROGRESSING') > judged.length / 2
      ? 'UP'
      : count('REGRESSION') > judged.length / 2
        ? 'DOWN'
        : 'STABLE';

  const main = cardioPlateaus
    .filter((p) => p.status !== 'INSUFFICIENT_DATA')
    .sort((a, b) => b.evidence.sessions - a.evidence.sessions)[0];
  const cTrend: DisciplineTrend = !main
    ? 'INSUFFICIENT_DATA'
    : main.status === 'PROGRESSING'
      ? 'UP'
      : main.status === 'REGRESSION'
        ? 'DOWN'
        : 'STABLE';

  let verdict: HybridVerdict;
  if (sTrend === 'INSUFFICIENT_DATA' || cTrend === 'INSUFFICIENT_DATA') {
    verdict = 'INSUFFICIENT_DATA';
  } else if (sTrend === 'UP' && cTrend === 'UP') verdict = 'BOTH_PROGRESSING';
  else if (sTrend === 'UP' && cTrend === 'DOWN')
    verdict = 'STRENGTH_UP_CARDIO_DOWN';
  else if (sTrend === 'DOWN' && cTrend === 'UP')
    verdict = 'CARDIO_UP_STRENGTH_DOWN';
  else if (sTrend === 'DOWN' && cTrend === 'DOWN') verdict = 'BOTH_DECLINING';
  else if (sTrend === 'UP') verdict = 'STRENGTH_UP_CARDIO_FLAT';
  else if (cTrend === 'UP') verdict = 'CARDIO_UP_STRENGTH_FLAT';
  else if (sTrend === 'DOWN' || cTrend === 'DOWN') verdict = 'ONE_DECLINING';
  else verdict = 'BOTH_STALLED';

  return {
    strength: {
      trend: sTrend,
      changePct: sChange === null ? null : round(sChange, 1),
      exercisesUsed: judged.length,
    },
    cardio: {
      trend: cTrend,
      changePct: main?.evidence.changePct ?? null,
      kind: main?.kind ?? null,
    },
    verdict,
  };
}

// -------------------------------- Resumen ----------------------------------

export interface HybridAnalysis {
  balance: DisciplineBalance;
  lowerBody: LowerBodyLoad;
  interference: Interference;
  evolution: HybridEvolution;
}

export function analyzeHybrid(
  sessions: TrainingSession[],
  exercises: Exercise[],
  strength: StrengthAnalysis,
  cardioPlateaus: CardioPlateau[],
  today: string,
  /** Días del reparto entre disciplinas; null = todo el historial. Por defecto, 28. */
  balanceDays: number | null = BALANCE_DAYS,
): HybridAnalysis {
  return {
    // «Todo» es una ventana lo bastante grande para cualquier historial.
    balance: balance(sessions, today, balanceDays ?? 36500),
    lowerBody: lowerBody(sessions, exercises, today),
    interference: interference(sessions, strength, today),
    evolution: evolution(strength, cardioPlateaus),
  };
}
