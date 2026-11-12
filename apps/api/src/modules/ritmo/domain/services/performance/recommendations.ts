import type { Muscle } from '../../entities/performance.entity';
import { cardioKindName, type EngineResults } from './performance-engine';
import { addDays } from './stats';
import { PLATEAU_WINDOW_DAYS } from './strength-engine';
import { CARDIO_WINDOW_DAYS } from './cardio-engine';

/**
 * Recomendaciones deterministas: reglas fijas sobre lo que dicen los motores.
 *
 * Cada una explica qué se ha observado y con qué datos. Son sugerencias de
 * entrenamiento, no consejo médico: no diagnostican lesiones ni estados de
 * salud. La misma entrada produce siempre las mismas recomendaciones.
 */

export type RecommendationCategory =
  | 'STRENGTH'
  | 'CARDIO'
  | 'LOAD'
  | 'MUSCLE'
  | 'HYBRID'
  | 'DATA';

/** INFO son buenas noticias o avisos sin acción. */
export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type RecommendationCode =
  | 'STRENGTH_REGRESSION'
  | 'STRENGTH_PLATEAU'
  | 'STRENGTH_PROGRESS'
  | 'CARDIO_REGRESSION'
  | 'CARDIO_PLATEAU'
  | 'AEROBIC_EFFICIENCY_UP'
  | 'LOWER_BODY_STACKING'
  | 'MUSCLE_VOLUME_CONCENTRATED'
  | 'MUSCLES_NEGLECTED'
  | 'PUSH_PULL_IMBALANCE'
  | 'NO_CARDIO'
  | 'NO_STRENGTH'
  | 'MOSTLY_HARD_SESSIONS'
  | 'LOAD_SPIKE'
  | 'LOAD_DROP'
  | 'HYBRID_DIVERGENCE'
  | 'LOG_RPE'
  | 'LOG_RIR'
  | 'SET_HEART_CONFIG';

export interface Recommendation {
  /** Estable entre ejecuciones: código y sujeto (`STRENGTH_PLATEAU:<ejercicio>`). */
  id: string;
  code: RecommendationCode;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  /** Qué se ha observado y qué se puede probar. */
  explanation: string;
  /** Las cifras que la justifican. */
  data: Record<string, number | string | boolean | null | string[]>;
  /** Periodo de datos en que se basa. */
  period: { from: string; to: string };
}

export const MUSCLE_NAME: Record<Muscle, string> = {
  CHEST: 'pectoral',
  LATS: 'dorsales',
  TRAPS: 'trapecio',
  FRONT_DELT: 'deltoides anterior',
  SIDE_DELT: 'deltoides lateral',
  REAR_DELT: 'deltoides posterior',
  BICEPS: 'bíceps',
  TRICEPS: 'tríceps',
  FOREARMS: 'antebrazos',
  QUADS: 'cuádriceps',
  HAMSTRINGS: 'isquiotibiales',
  GLUTES: 'glúteos',
  CALVES: 'gemelos',
  ABS: 'abdominales',
  LOWER_BACK: 'lumbar',
};

const ORDER: Record<RecommendationPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  INFO: 3,
};

/** Series semanales a partir de las cuales tiene sentido hablar de concentración. */
const CONCENTRATED_MIN_SETS = 8;
const CONCENTRATED_SHARE = 0.9;
/** Días sin trabajar un músculo para listarlo (si se entrena fuerza con regularidad). */
const NEGLECTED_DAYS = 21;
/** Razón empuje/tirón fuera de la cual se señala. */
const PUSH_PULL_MAX = 1.5;
/** Mejora de eficiencia (%) que merece destacarse. */
const EFFICIENCY_HIGHLIGHT_PCT = 3;
/** Máximo de avisos positivos de fuerza, para no llenar la lista. */
const MAX_PROGRESS = 3;

const pct = (v: number | null) =>
  v === null
    ? 'sin dato'
    : `${v > 0 ? '+' : ''}${String(v).replace('.', ',')} %`;

export function buildRecommendations(
  engines: EngineResults,
  today: string,
): Recommendation[] {
  const { strength, cardio, fatigue, hybrid, muscles } = engines;
  const out: Recommendation[] = [];
  const window = (days: number) => ({ from: addDays(today, -days), to: today });

  // ------------------------------ Fuerza --------------------------------
  let progress = 0;
  for (const e of strength.exercises) {
    const ev = e.plateau.evidence;
    const data = {
      exercise: e.name,
      metric: ev.metric,
      sessions: ev.sessions,
      baselineMedian: ev.baselineMedian,
      recentMedian: ev.recentMedian,
      changePct: ev.changePct,
      trendPctPerWeek: ev.trendPctPerWeek,
      daysSinceRecord: ev.daysSinceRecord,
      repsChangePct: ev.repsChangePct,
      volumeChangePct: ev.volumeChangePct,
      signals: e.plateau.signals,
    };
    const period = window(PLATEAU_WINDOW_DAYS);
    if (e.plateau.status === 'REGRESSION') {
      out.push({
        id: `STRENGTH_REGRESSION:${e.exerciseId}`,
        code: 'STRENGTH_REGRESSION',
        category: 'STRENGTH',
        priority: 'HIGH',
        title: `${e.name}: el rendimiento baja`,
        explanation: `En ${ev.sessions} sesiones de las últimas 8 semanas tu rendimiento ha pasado de ${ev.baselineMedian} a ${ev.recentMedian} (${pct(ev.changePct)}), con ${ev.recentSessionsBelowBaseline} sesiones recientes por debajo de tu referencia. Revisa si ha subido tu carga total, si descansas menos entre sesiones o si has cambiado la técnica o el orden del ejercicio.`,
        data,
        period,
      });
    } else if (e.plateau.status === 'POTENTIAL_PLATEAU') {
      out.push({
        id: `STRENGTH_PLATEAU:${e.exerciseId}`,
        code: 'STRENGTH_PLATEAU',
        category: 'STRENGTH',
        priority: 'MEDIUM',
        title: `${e.name}: posible estancamiento`,
        explanation: `Llevas ${ev.sessions} sesiones en 8 semanas sin mejora clara (${pct(ev.changePct)}) y tu mejor marca es de hace ${ev.daysSinceRecord ?? '—'} días. Puedes probar a variar el rango de repeticiones, añadir una serie o cambiar el orden en la sesión.`,
        data,
        period,
      });
    } else if (
      e.plateau.status === 'PROGRESSING' &&
      e.plateau.signals.includes('NEW_PERSONAL_RECORD') &&
      progress < MAX_PROGRESS
    ) {
      progress += 1;
      out.push({
        id: `STRENGTH_PROGRESS:${e.exerciseId}`,
        code: 'STRENGTH_PROGRESS',
        category: 'STRENGTH',
        priority: 'INFO',
        title: `${e.name}: progresas`,
        explanation: `Marca nueva en las últimas semanas y una mejora de ${pct(ev.changePct)} entre la primera y la segunda mitad del periodo. Lo que estás haciendo funciona.`,
        data,
        period,
      });
    }
  }

  // ------------------------------- Cardio -------------------------------
  for (const p of cardio.plateaus) {
    const ev = p.evidence;
    const name = cardioKindName(p.kind);
    const data = {
      kind: p.kind,
      metric: ev.metric,
      sessions: ev.sessions,
      changePct: ev.changePct,
      baselinePaceSecPerKm: ev.baselinePaceSecPerKm,
      recentPaceSecPerKm: ev.recentPaceSecPerKm,
      hrShiftAtSimilarPace: ev.hrShiftAtSimilarPace,
      daysSinceBestEffort: ev.daysSinceBestEffort,
      weeklyLoadChangePct: ev.weeklyLoadChangePct,
      unknownTerrain: ev.unknownTerrain,
      signals: p.signals,
    };
    const period = window(CARDIO_WINDOW_DAYS);
    const what =
      ev.metric === 'EFFICIENCY' ? 'tu eficiencia aeróbica' : 'tu velocidad';
    if (p.status === 'REGRESSION') {
      out.push({
        id: `CARDIO_REGRESSION:${p.kind}`,
        code: 'CARDIO_REGRESSION',
        category: 'CARDIO',
        priority: 'HIGH',
        title: `${name}: el rendimiento baja de forma persistente`,
        explanation: `En ${ev.sessions} sesiones comparables de las últimas 12 semanas ${what} ha cambiado ${pct(ev.changePct)}${ev.hrShiftAtSimilarPace !== null && ev.hrShiftAtSimilarPace > 0 ? `, con ${ev.hrShiftAtSimilarPace} pulsaciones más a un ritmo similar` : ''}. Puede deberse a carga acumulada, calor o falta de descanso; unas semanas con más sesiones suaves suelen ayudar.`,
        data,
        period,
      });
    } else if (p.status === 'POTENTIAL_PLATEAU') {
      const loadUp = p.signals.includes('LOAD_UP_WITHOUT_GAIN');
      out.push({
        id: `CARDIO_PLATEAU:${p.kind}`,
        code: 'CARDIO_PLATEAU',
        category: 'CARDIO',
        priority: 'MEDIUM',
        title: `${name}: posible estancamiento`,
        explanation: `${ev.sessions} sesiones comparables en 12 semanas sin mejora clara de ${what} (${pct(ev.changePct)}).${loadUp ? ` Además entrenas más tiempo (${pct(ev.weeklyLoadChangePct)}) sin que mejore.` : ''} Puedes probar a variar los estímulos: una sesión de ritmo o de series y el resto suaves.`,
        data,
        period,
      });
    } else if (
      p.status === 'PROGRESSING' &&
      p.signals.includes('EFFICIENCY_UP') &&
      (ev.changePct ?? 0) >= EFFICIENCY_HIGHLIGHT_PCT
    ) {
      out.push({
        id: `AEROBIC_EFFICIENCY_UP:${p.kind}`,
        code: 'AEROBIC_EFFICIENCY_UP',
        category: 'CARDIO',
        priority: 'INFO',
        title: `${name}: mejora tu eficiencia aeróbica`,
        explanation: `Vas más rápido a las mismas pulsaciones: ${pct(ev.changePct)} en ${ev.sessions} sesiones comparables.`,
        data,
        period,
      });
    }
  }

  // ---------------------------- Tren inferior ----------------------------
  const lb = hybrid.lowerBody;
  if (lb.maxConsecutiveDemandingDays >= 2 || lb.closePairs.length > 0) {
    out.push({
      id: 'LOWER_BODY_STACKING',
      code: 'LOWER_BODY_STACKING',
      category: 'HYBRID',
      priority: lb.maxConsecutiveDemandingDays >= 3 ? 'HIGH' : 'MEDIUM',
      title: 'Esfuerzos exigentes de pierna muy seguidos',
      explanation: `En las últimas 2 semanas has encadenado ${lb.maxConsecutiveDemandingDays} días seguidos de esfuerzo exigente de tren inferior (pierna en fuerza, o carrera o bici duras o largas) y hay ${lb.closePairs.length} pares con menos de 36 horas entre ellos. Separar la sesión de pierna de los días de calidad en carrera suele mejorar las dos.`,
      data: {
        maxConsecutiveDemandingDays: lb.maxConsecutiveDemandingDays,
        closePairs: lb.closePairs.length,
        mixedPairs: lb.closePairs.filter((p) => p.mixed).length,
        demandingLast7: lb.demandingLast7,
      },
      period: window(lb.windowDays),
    });
  }

  // ------------------------------- Músculo -------------------------------
  const concentrated = muscles.muscles.filter(
    (m) =>
      m.last7.weightedSets >= CONCENTRATED_MIN_SETS &&
      (m.maxSessionShare7d ?? 0) >= CONCENTRATED_SHARE,
  );
  for (const m of concentrated) {
    out.push({
      id: `MUSCLE_VOLUME_CONCENTRATED:${m.muscle}`,
      code: 'MUSCLE_VOLUME_CONCENTRATED',
      category: 'MUSCLE',
      priority: 'LOW',
      title: `Todo el trabajo de ${MUSCLE_NAME[m.muscle]} en una sesión`,
      explanation: `Esta semana has hecho ${m.last7.weightedSets} series de ${MUSCLE_NAME[m.muscle]} y el ${Math.round((m.maxSessionShare7d ?? 0) * 100)} % en una sola sesión. Repartirlas en dos días suele permitir más calidad por serie.`,
      data: {
        muscle: m.muscle,
        weightedSets7d: m.last7.weightedSets,
        maxSessionShare7d: m.maxSessionShare7d,
      },
      period: window(7),
    });
  }

  const trainsStrength = hybrid.balance.strength.sessions >= 4;
  const neglected = muscles.muscles.filter(
    (m) => m.daysSinceLast === null || m.daysSinceLast >= NEGLECTED_DAYS,
  );
  if (trainsStrength && neglected.length) {
    out.push({
      id: 'MUSCLES_NEGLECTED',
      code: 'MUSCLES_NEGLECTED',
      category: 'MUSCLE',
      priority: 'LOW',
      title: 'Grupos musculares sin trabajar',
      explanation: `Llevas 3 semanas o más sin trabajar de forma directa o secundaria: ${neglected.map((m) => MUSCLE_NAME[m.muscle]).join(', ')}.`,
      data: { muscles: neglected.map((m) => m.muscle) },
      period: window(NEGLECTED_DAYS),
    });
  }

  const pp = fatigue.imbalances.pushPullRatio;
  if (pp !== null && (pp > PUSH_PULL_MAX || pp < 1 / PUSH_PULL_MAX)) {
    const more = pp > 1 ? 'empuje' : 'tirón';
    out.push({
      id: 'PUSH_PULL_IMBALANCE',
      code: 'PUSH_PULL_IMBALANCE',
      category: 'MUSCLE',
      priority: 'LOW',
      title: `Mucho más ${more} que ${pp > 1 ? 'tirón' : 'empuje'}`,
      explanation: `En los últimos 30 días la relación entre series de empuje y de tirón es de ${String(pp).replace('.', ',')}. Si no es intencionado, puedes equilibrarlo añadiendo series del lado que queda atrás.`,
      data: { pushPullRatio: pp },
      period: window(30),
    });
  }

  // ------------------------------ Equilibrio -----------------------------
  const bal = hybrid.balance;
  if (bal.flags.includes('NO_CARDIO')) {
    out.push({
      id: 'NO_CARDIO',
      code: 'NO_CARDIO',
      category: 'HYBRID',
      priority: 'MEDIUM',
      title: 'Sin entrenamiento cardiovascular',
      explanation:
        bal.daysSinceCardio === null
          ? 'Entrenas fuerza pero no hay ninguna sesión de cardio registrada.'
          : `Tu última sesión de cardio fue hace ${bal.daysSinceCardio} días.`,
      data: {
        daysSinceCardio: bal.daysSinceCardio,
        strengthSessions: bal.strength.sessions,
      },
      period: window(bal.windowDays),
    });
  }
  if (bal.flags.includes('NO_STRENGTH')) {
    out.push({
      id: 'NO_STRENGTH',
      code: 'NO_STRENGTH',
      category: 'HYBRID',
      priority: 'MEDIUM',
      title: 'Sin entrenamiento de fuerza',
      explanation:
        bal.daysSinceStrength === null
          ? 'Haces cardio pero no hay ninguna sesión de fuerza registrada.'
          : `Tu última sesión de fuerza fue hace ${bal.daysSinceStrength} días.`,
      data: {
        daysSinceStrength: bal.daysSinceStrength,
        cardioSessions: bal.cardio.sessions,
      },
      period: window(bal.windowDays),
    });
  }
  if (bal.flags.includes('MOSTLY_HARD')) {
    out.push({
      id: 'MOSTLY_HARD_SESSIONS',
      code: 'MOSTLY_HARD_SESSIONS',
      category: 'LOAD',
      priority: 'MEDIUM',
      title: 'Casi todas tus sesiones son exigentes',
      explanation: `En 4 semanas, ${bal.intensity.hard} sesiones exigentes (RPE 8 o más), ${bal.intensity.moderate} medias y ${bal.intensity.easy} suaves. Intercalar sesiones suaves ayuda a sostener la carga.`,
      data: { ...bal.intensity },
      period: window(bal.windowDays),
    });
  }

  // -------------------------------- Carga --------------------------------
  const load = fatigue.load;
  if (load.status === 'WELL_ABOVE_USUAL' || load.status === 'ABOVE_USUAL') {
    out.push({
      id: 'LOAD_SPIKE',
      code: 'LOAD_SPIKE',
      category: 'LOAD',
      priority: load.status === 'WELL_ABOVE_USUAL' ? 'HIGH' : 'MEDIUM',
      title: 'Tu carga reciente está por encima de lo habitual',
      explanation: `Tu carga de los últimos días es ${String(load.ratio).replace('.', ',')} veces la de tus últimas 4 semanas, con ${fatigue.demanding.last7} sesiones exigentes en 7 días. Subir la carga poco a poco y dejar algún día suave suele sentar mejor.`,
      data: {
        ratio: load.ratio,
        recent: load.recent,
        usual: load.usual,
        last7: load.last7,
        previous7: load.previous7,
        demandingLast7: fatigue.demanding.last7,
      },
      period: window(28),
    });
  } else if (load.status === 'WELL_BELOW_USUAL') {
    out.push({
      id: 'LOAD_DROP',
      code: 'LOAD_DROP',
      category: 'LOAD',
      priority: 'LOW',
      title: 'Entrenas bastante menos de lo habitual',
      explanation: `Tu carga reciente es ${String(load.ratio).replace('.', ',')} veces la habitual. Si es una semana de descarga, perfecto; si no, vuelve de forma gradual.`,
      data: { ratio: load.ratio, last7: load.last7, previous7: load.previous7 },
      period: window(28),
    });
  }

  // ------------------------------- Híbrido -------------------------------
  const evo = hybrid.evolution;
  if (
    evo.verdict === 'STRENGTH_UP_CARDIO_DOWN' ||
    evo.verdict === 'CARDIO_UP_STRENGTH_DOWN'
  ) {
    const strengthUp = evo.verdict === 'STRENGTH_UP_CARDIO_DOWN';
    out.push({
      id: 'HYBRID_DIVERGENCE',
      code: 'HYBRID_DIVERGENCE',
      category: 'HYBRID',
      priority: 'MEDIUM',
      title: strengthUp
        ? 'La fuerza sube mientras el cardio baja'
        : 'El cardio sube mientras la fuerza baja',
      explanation: `Fuerza: ${pct(evo.strength.changePct)} en ${evo.strength.exercisesUsed} ejercicios. Cardio: ${pct(evo.cardio.changePct)}. Es una coincidencia en el tiempo, no una causa demostrada; revisa cómo repartes la carga entre las dos.`,
      data: {
        verdict: evo.verdict,
        strengthChangePct: evo.strength.changePct,
        cardioChangePct: evo.cardio.changePct,
        cardioKind: evo.cardio.kind,
        strengthLoadShare: bal.strengthLoadShare,
      },
      period: window(CARDIO_WINDOW_DAYS),
    });
  }

  // -------------------------------- Datos --------------------------------
  const dq = fatigue.dataQuality;
  if (dq.sessions >= 5 && dq.withRecordedRpe / dq.sessions < 0.5) {
    out.push({
      id: 'LOG_RPE',
      code: 'LOG_RPE',
      category: 'DATA',
      priority: 'INFO',
      title: 'Apunta el esfuerzo de tus sesiones',
      explanation: `Solo ${dq.withRecordedRpe} de ${dq.sessions} sesiones tienen RPE apuntado. Es la base del cálculo de carga: con él los avisos son más fiables.`,
      data: {
        sessions: dq.sessions,
        withRecordedRpe: dq.withRecordedRpe,
        withEstimatedRpe: dq.withEstimatedRpe,
        withoutLoad: dq.withoutLoad,
      },
      period: window(dq.historyDays),
    });
  }
  if (strength.exercises.length && muscles.rirCoverage < 0.5) {
    out.push({
      id: 'LOG_RIR',
      code: 'LOG_RIR',
      category: 'DATA',
      priority: 'INFO',
      title: 'Apunta el RIR de tus series',
      explanation: `Solo el ${Math.round(muscles.rirCoverage * 100)} % de tus series tienen RIR. Sin él, el 1RM estimado asume que cada serie fue al fallo y queda por debajo del real.`,
      data: { rirCoverage: muscles.rirCoverage },
      period: window(dq.historyDays),
    });
  }
  if (cardio.dataQuality.withHeartRate > 0 && !cardio.zones) {
    out.push({
      id: 'SET_HEART_CONFIG',
      code: 'SET_HEART_CONFIG',
      category: 'DATA',
      priority: 'INFO',
      title: 'Configura tus zonas cardíacas',
      explanation:
        'Registras pulsaciones pero no has indicado tu FC máxima. Con ella (y la de reposo) se calculan tus zonas y la carga cardiovascular.',
      data: { sessionsWithHeartRate: cardio.dataQuality.withHeartRate },
      period: window(cardio.periodDays ?? dq.historyDays),
    });
  }

  return out.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
}
