// Fórmulas de energía del proyecto. Dominio puro: funciones sin estado, sin
// Nest, sin Prisma — por eso son trivialmente testeables y por eso viven aquí
// y no dentro de un use case.
//
// Referencias de las constantes:
// - BMR: Mifflin-St Jeor (1990), hoy el estándar frente a Harris-Benedict.
// - Multiplicadores de actividad: los clásicos 1.2 … 1.9 sobre el BMR.
// - 7700 kcal ≈ 1 kg de tejido adiposo, para traducir "kg/semana" a déficit
//   diario.
// - kcal por MET: MET × 3.5 × kg / 200 por minuto (ACSM).
import type {
  ActivityLevel,
  GoalType,
  Sex,
} from '../entities/ritmo-profile.entity';
import type { Effort } from '../entities/activity-session.entity';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/// Constante de sexo de Mifflin-St Jeor. `OTHER` (y desconocido) usa la media
/// de ambas en vez de asumir una: es la opción menos equivocada cuando no se
/// tiene el dato.
const SEX_CONSTANT: Record<Sex, number> = {
  MALE: 5,
  FEMALE: -161,
  OTHER: -78,
};

/** Ritmo semanal por defecto (kg/semana) cuando el usuario no elige uno. */
const DEFAULT_WEEKLY_CHANGE: Record<GoalType, number> = {
  LOSE_WEIGHT: -0.5,
  MAINTAIN: 0,
  GAIN_MUSCLE: 0.25,
};

/** Proteína objetivo en g por kg de peso corporal, según el objetivo. */
const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  LOSE_WEIGHT: 2.0,
  MAINTAIN: 1.6,
  GAIN_MUSCLE: 1.8,
};

/** Fracción de las kcal objetivo que se cubren con grasa. */
const FAT_KCAL_SHARE = 0.25;

const KCAL_PER_KG_FAT = 7700;

/**
 * Suelo absoluto de kcal diarias. Un objetivo por debajo de esto no es una
 * dieta, es un problema médico; la app no lo propone nunca, aunque el ritmo
 * elegido lo pida.
 */
export const MIN_DAILY_KCAL = 1200;

/** Acotación del ritmo semanal, en kg/semana. Fuera de esto no es saludable. */
export const MIN_WEEKLY_CHANGE_KG = -1;
export const MAX_WEEKLY_CHANGE_KG = 1;

/** Multiplicador por esfuerzo percibido, cuando la sesión no trae pulsaciones. */
const EFFORT_FACTOR: Record<Effort, number> = {
  LIGHT: 0.85,
  MODERATE: 1,
  VIGOROUS: 1.15,
};

export function ageFromBirthDate(birthDate: string, today: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = today.getUTCFullYear() - y;
  const monthDiff = today.getUTCMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < d)) age -= 1;
  return Math.max(age, 0);
}

/** Metabolismo basal (Mifflin-St Jeor), en kcal/día. */
export function basalMetabolicRate(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex | null;
}): number {
  const bmr =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.age +
    SEX_CONSTANT[input.sex ?? 'OTHER'];
  return Math.round(bmr);
}

/** Gasto diario total: BMR por el multiplicador del nivel de actividad. */
export function totalDailyEnergyExpenditure(
  bmrKcal: number,
  level: ActivityLevel,
): number {
  return Math.round(bmrKcal * ACTIVITY_FACTOR[level]);
}

export function defaultWeeklyChangeKg(goal: GoalType): number {
  return DEFAULT_WEEKLY_CHANGE[goal];
}

export function clampWeeklyChangeKg(value: number): number {
  return Math.min(Math.max(value, MIN_WEEKLY_CHANGE_KG), MAX_WEEKLY_CHANGE_KG);
}

/**
 * kcal diarias objetivo: el gasto total corregido por el ritmo de cambio de
 * peso deseado, con el suelo de `MIN_DAILY_KCAL`.
 */
export function dailyKcalTarget(
  tdeeKcal: number,
  weeklyWeightChangeKg: number,
): number {
  const dailyDelta =
    (clampWeeklyChangeKg(weeklyWeightChangeKg) * KCAL_PER_KG_FAT) / 7;
  return Math.max(Math.round(tdeeKcal + dailyDelta), MIN_DAILY_KCAL);
}

export interface MacroTargets {
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
}

/**
 * Reparto de macros: la proteína se fija por peso corporal (es lo que protege
 * masa muscular en déficit), la grasa como fracción de las kcal, y los hidratos
 * son el resto. Si el resto saliera negativo se recorta a 0 en vez de devolver
 * un plan imposible.
 */
export function macroTargets(input: {
  kcalTarget: number;
  weightKg: number;
  goal: GoalType;
}): MacroTargets {
  const proteinTargetG = Math.round(
    PROTEIN_G_PER_KG[input.goal] * input.weightKg,
  );
  const fatTargetG = Math.round((input.kcalTarget * FAT_KCAL_SHARE) / 9);
  const remainingKcal = input.kcalTarget - proteinTargetG * 4 - fatTargetG * 9;
  return {
    proteinTargetG,
    fatTargetG,
    carbsTargetG: Math.max(Math.round(remainingKcal / 4), 0),
  };
}

export interface EnergyTargets extends MacroTargets {
  bmrKcal: number;
  tdeeKcal: number;
  dailyKcalTarget: number;
  weeklyWeightChangeKg: number;
}

/**
 * Recalcula todos los targets del perfil de una vez. Devuelve `null` si faltan
 * datos imprescindibles (peso, altura o edad): preferimos un perfil sin
 * objetivo a un objetivo inventado sobre valores por defecto.
 */
export function computeEnergyTargets(input: {
  weightKg: number | null;
  heightCm: number | null;
  birthDate: string | null;
  sex: Sex | null;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  weeklyWeightChangeKg: number | null;
  today: Date;
}): EnergyTargets | null {
  if (
    input.weightKg === null ||
    input.heightCm === null ||
    input.birthDate === null
  ) {
    return null;
  }

  const bmrKcal = basalMetabolicRate({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age: ageFromBirthDate(input.birthDate, input.today),
    sex: input.sex,
  });
  const tdeeKcal = totalDailyEnergyExpenditure(bmrKcal, input.activityLevel);
  const weeklyWeightChangeKg = clampWeeklyChangeKg(
    input.weeklyWeightChangeKg ?? defaultWeeklyChangeKg(input.goalType),
  );
  const kcalTarget = dailyKcalTarget(tdeeKcal, weeklyWeightChangeKg);

  return {
    bmrKcal,
    tdeeKcal,
    dailyKcalTarget: kcalTarget,
    weeklyWeightChangeKg,
    ...macroTargets({
      kcalTarget,
      weightKg: input.weightKg,
      goal: input.goalType,
    }),
  };
}

/**
 * Gasto estimado de una sesión: MET × 3.5 × kg / 200 por minuto, ajustado por
 * esfuerzo percibido si se ha indicado.
 */
export function sessionKcal(input: {
  met: number;
  weightKg: number;
  durationSec: number;
  effort: Effort | null;
}): number {
  const minutes = input.durationSec / 60;
  const kcal =
    ((input.met * 3.5 * input.weightKg) / 200) *
    minutes *
    (input.effort ? EFFORT_FACTOR[input.effort] : 1);
  return Math.max(Math.round(kcal), 0);
}

/** Escala los valores por 100 g de un alimento a la cantidad consumida. */
export function scaleMacros(
  per100: {
    kcalPer100: number;
    proteinPer100G: number;
    carbsPer100G: number;
    fatPer100G: number;
  },
  quantityG: number,
): { kcal: number; proteinG: number; carbsG: number; fatG: number } {
  const factor = quantityG / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    kcal: Math.round(per100.kcalPer100 * factor),
    proteinG: round1(per100.proteinPer100G * factor),
    carbsG: round1(per100.carbsPer100G * factor),
    fatG: round1(per100.fatPer100G * factor),
  };
}
