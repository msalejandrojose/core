// Traducción fila Prisma → entidad de dominio, en un único sitio.
//
// Dos conversiones recurrentes:
//  - Las columnas `Decimal` llegan como objeto Decimal (decimal.js). El
//    dominio trabaja con `number`, así que se convierten aquí y no en cada
//    use case.
//  - Las columnas `@db.Date` llegan como `Date` a medianoche UTC. El dominio
//    habla de días naturales (`YYYY-MM-DD`), que es lo que viaja por HTTP y lo
//    que la app usa para agrupar.
import type {
  ActivitySession,
  ActivitySource,
  Effort,
} from '../../domain/entities/activity-session.entity';
import type { ActivityType } from '../../domain/entities/activity-type.entity';
import type {
  ActivityKind,
  StrengthSet,
} from '../../domain/entities/performance.entity';
import type { BodyMeasurement } from '../../domain/entities/body-measurement.entity';
import type { DailyLog } from '../../domain/entities/daily-log.entity';
import type { Food, FoodSource } from '../../domain/entities/food.entity';
import type {
  MealEntry,
  MealType,
} from '../../domain/entities/meal-entry.entity';
import type {
  ActivityLevel,
  GoalType,
  RitmoProfile,
  Sex,
} from '../../domain/entities/ritmo-profile.entity';

/** Cualquier cosa que Prisma devuelva para un `Decimal` o un numérico. */
type Numeric = { toString(): string } | number | null;

export function num(value: Numeric): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value.toString());
}

/** Igual que `num`, para columnas no nulables. */
export function numReq(value: Exclude<Numeric, null>): number {
  return num(value) as number;
}

/** `Date` (columna DATE) → día natural `YYYY-MM-DD`. */
export function toDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Día natural `YYYY-MM-DD` → `Date` a medianoche UTC, como espera la columna. */
export function toDateOnly(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

interface ProfileRow {
  id: string;
  userId: string;
  sex: string | null;
  birthDate: Date | null;
  heightCm: Numeric;
  activityLevel: string;
  goalType: string;
  targetWeightKg: Numeric;
  weeklyWeightChangeKg: Numeric;
  bmrKcal: number | null;
  tdeeKcal: number | null;
  dailyKcalTarget: number | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  timezone: string;
  onboardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toProfile(row: ProfileRow): RitmoProfile {
  return {
    id: row.id,
    userId: row.userId,
    sex: row.sex as Sex | null,
    birthDate: row.birthDate ? toDay(row.birthDate) : null,
    heightCm: num(row.heightCm),
    activityLevel: row.activityLevel as ActivityLevel,
    goalType: row.goalType as GoalType,
    targetWeightKg: num(row.targetWeightKg),
    weeklyWeightChangeKg: num(row.weeklyWeightChangeKg),
    bmrKcal: row.bmrKcal,
    tdeeKcal: row.tdeeKcal,
    dailyKcalTarget: row.dailyKcalTarget,
    proteinTargetG: row.proteinTargetG,
    carbsTargetG: row.carbsTargetG,
    fatTargetG: row.fatTargetG,
    timezone: row.timezone,
    onboardedAt: row.onboardedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface MeasurementRow {
  id: string;
  userId: string;
  measuredOn: Date;
  weightKg: Numeric;
  bodyFatPct: Numeric;
  waistCm: Numeric;
  notes: string | null;
}

export function toMeasurement(row: MeasurementRow): BodyMeasurement {
  return {
    id: row.id,
    userId: row.userId,
    measuredOn: toDay(row.measuredOn),
    weightKg: numReq(row.weightKg as Exclude<Numeric, null>),
    bodyFatPct: num(row.bodyFatPct),
    waistCm: num(row.waistCm),
    notes: row.notes,
  };
}

interface ActivityTypeRow {
  id: string;
  code: string | null;
  name: string;
  met: Numeric;
  icon: string | null;
  kind: string;
  ownerUserId: string | null;
}

export function toActivityType(row: ActivityTypeRow): ActivityType {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    met: numReq(row.met as Exclude<Numeric, null>),
    kind: row.kind as ActivityKind,
    icon: row.icon,
    ownerUserId: row.ownerUserId,
  };
}

interface SessionRow {
  id: string;
  userId: string;
  activityTypeId: string;
  startedAt: Date;
  loggedOn: Date;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate?: number | null;
  elevationGainM?: number | null;
  cadence?: number | null;
  rpe?: number | null;
  zoneSeconds?: unknown;
  effort: string | null;
  kcalBurned: number;
  notes: string | null;
  source: string;
  activityType?: { name: string; kind?: string } | null;
  strengthSets?: StrengthSetRow[];
}

export interface StrengthSetRow {
  exerciseId: string;
  exerciseOrder: number;
  setOrder: number;
  weightKg: Numeric;
  reps: number;
  rir: number | null;
  restSec: number | null;
  isWarmup: boolean;
}

export function toStrengthSet(row: StrengthSetRow): StrengthSet {
  return {
    exerciseId: row.exerciseId,
    exerciseOrder: row.exerciseOrder,
    setOrder: row.setOrder,
    weightKg: numReq(row.weightKg as Exclude<Numeric, null>),
    reps: row.reps,
    rir: row.rir,
    restSec: row.restSec,
    isWarmup: row.isWarmup,
  };
}

/** `zone_seconds` es JSON libre en la BBDD: solo vale un array de 5 números. */
export function toZoneSeconds(value: unknown): number[] | null {
  return Array.isArray(value) &&
    value.length === 5 &&
    value.every((v) => typeof v === 'number')
    ? value
    : null;
}

/** Series en el orden en que se hicieron. */
export function sortSets(rows: StrengthSetRow[]): StrengthSet[] {
  return rows
    .map(toStrengthSet)
    .sort(
      (a, b) => a.exerciseOrder - b.exerciseOrder || a.setOrder - b.setOrder,
    );
}

export function toSession(row: SessionRow): ActivitySession {
  return {
    id: row.id,
    userId: row.userId,
    activityTypeId: row.activityTypeId,
    activityTypeName: row.activityType?.name ?? '',
    startedAt: row.startedAt,
    loggedOn: toDay(row.loggedOn),
    durationSec: row.durationSec,
    distanceM: row.distanceM,
    avgHeartRate: row.avgHeartRate,
    maxHeartRate: row.maxHeartRate ?? null,
    elevationGainM: row.elevationGainM ?? null,
    cadence: row.cadence ?? null,
    rpe: row.rpe ?? null,
    zoneSeconds: toZoneSeconds(row.zoneSeconds),
    kind: (row.activityType?.kind ?? 'OTHER') as ActivityKind,
    sets: sortSets(row.strengthSets ?? []),
    effort: row.effort as Effort | null,
    kcalBurned: row.kcalBurned,
    notes: row.notes,
    source: row.source as ActivitySource,
  };
}

interface FoodRow {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: string;
  ownerUserId: string | null;
  isVerified: boolean;
  isLiquid: boolean;
  kcalPer100: number;
  proteinPer100G: Numeric;
  carbsPer100G: Numeric;
  fatPer100G: Numeric;
  servings?: {
    id: string;
    label: string;
    grams: Numeric;
    isDefault: boolean;
  }[];
}

export function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    source: row.source as FoodSource,
    ownerUserId: row.ownerUserId,
    isVerified: row.isVerified,
    isLiquid: row.isLiquid,
    kcalPer100: row.kcalPer100,
    proteinPer100G: numReq(row.proteinPer100G as Exclude<Numeric, null>),
    carbsPer100G: numReq(row.carbsPer100G as Exclude<Numeric, null>),
    fatPer100G: numReq(row.fatPer100G as Exclude<Numeric, null>),
    servings: (row.servings ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      grams: numReq(s.grams as Exclude<Numeric, null>),
      isDefault: s.isDefault,
    })),
  };
}

interface MealEntryRow {
  id: string;
  userId: string;
  loggedOn: Date;
  mealType: string;
  foodId: string | null;
  servingId: string | null;
  customName: string | null;
  quantityG: Numeric;
  kcal: number;
  proteinG: Numeric;
  carbsG: Numeric;
  fatG: Numeric;
  food?: { name: string; brand: string | null } | null;
}

export function toMealEntry(row: MealEntryRow): MealEntry {
  const fromFood = row.food
    ? row.food.brand
      ? `${row.food.name} (${row.food.brand})`
      : row.food.name
    : null;
  return {
    id: row.id,
    userId: row.userId,
    loggedOn: toDay(row.loggedOn),
    mealType: row.mealType as MealType,
    foodId: row.foodId,
    servingId: row.servingId,
    // El texto libre manda sobre el nombre del catálogo: es lo que el usuario
    // escribió. Si el alimento se borró (`foodId` a null) sigue habiendo nombre.
    name: row.customName ?? fromFood ?? 'Comida',
    quantityG: numReq(row.quantityG as Exclude<Numeric, null>),
    kcal: row.kcal,
    proteinG: numReq(row.proteinG as Exclude<Numeric, null>),
    carbsG: numReq(row.carbsG as Exclude<Numeric, null>),
    fatG: numReq(row.fatG as Exclude<Numeric, null>),
  };
}

interface DailyLogRow {
  userId: string;
  logDate: Date;
  kcalIn: number;
  kcalBurned: number;
  kcalTarget: number | null;
  proteinG: Numeric;
  carbsG: Numeric;
  fatG: Numeric;
  steps: number | null;
  waterMl: number | null;
  weightKg: Numeric;
}

export function toDailyLog(row: DailyLogRow): DailyLog {
  return {
    userId: row.userId,
    logDate: toDay(row.logDate),
    kcalIn: row.kcalIn,
    kcalBurned: row.kcalBurned,
    kcalTarget: row.kcalTarget,
    proteinG: numReq(row.proteinG as Exclude<Numeric, null>),
    carbsG: numReq(row.carbsG as Exclude<Numeric, null>),
    fatG: numReq(row.fatG as Exclude<Numeric, null>),
    steps: row.steps,
    waterMl: row.waterMl,
    weightKg: num(row.weightKg),
  };
}
