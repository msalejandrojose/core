import { apiClient } from '@/api/client';

/**
 * Capa de acceso a los endpoints de Brío (`/brio/*`).
 *
 * El schema OpenAPI tipado de `@core/api-client` se genera contra una API
 * levantada, así que todavía no incluye estas rutas (igual que pasa con las de
 * dashboard — ver `features/home/use-dashboard-summary.ts`). Hasta que se
 * regenere, el cliente se usa con un cast puntual y los tipos del contrato se
 * declaran aquí a mano, en UN solo sitio: así las pantallas siguen tipadas y
 * cuando se regenere el schema solo cambia este archivo.
 */

export type Sex = 'MALE' | 'FEMALE' | 'OTHER';
export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'ACTIVE'
  | 'VERY_ACTIVE';
export type GoalType = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type Effort = 'LIGHT' | 'MODERATE' | 'VIGOROUS';

export interface BrioProfile {
  id: string;
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeightKg: number | null;
  weeklyWeightChangeKg: number | null;
  bmrKcal: number | null;
  tdeeKcal: number | null;
  dailyKcalTarget: number | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  timezone: string;
  currentWeightKg: number | null;
  onboardedAt: string | null;
}

export interface SaveProfileBody {
  sex?: Sex;
  birthDate?: string;
  heightCm?: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeightKg?: number;
  weeklyWeightChangeKg?: number;
  timezone?: string;
}

export interface ActivityType {
  id: string;
  code: string | null;
  name: string;
  met: number;
  /** Disciplina: STRENGTH admite series; RUN, CYCLE… son cardio. */
  kind: string;
  icon: string | null;
  isCustom: boolean;
}

export interface ActivitySession {
  id: string;
  activityTypeId: string;
  activityTypeName: string;
  startedAt: string;
  loggedOn: string;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate?: number | null;
  elevationGainM?: number | null;
  cadence?: number | null;
  /** Esfuerzo percibido CR10 (1–10). */
  rpe?: number | null;
  /** Segundos en Z1..Z5. */
  zoneSeconds?: number[] | null;
  /** Disciplina del tipo de actividad (STRENGTH, RUN…). */
  kind?: string;
  /** Series de fuerza, en orden. */
  sets?: {
    exerciseId: string;
    exerciseOrder: number;
    setOrder: number;
    weightKg: number;
    reps: number;
    rir: number | null;
    restSec: number | null;
    isWarmup: boolean;
  }[];
  effort: Effort | null;
  kcalBurned: number;
  notes: string | null;
  source: string;
}

export interface FoodServing {
  id: string;
  label: string;
  grams: number;
  isDefault: boolean;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  isVerified: boolean;
  isLiquid: boolean;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  servings: FoodServing[];
}

/** Corrección de una entrada (PATCH /brio/meals/:id). */
export interface UpdateMealBody {
  mealType?: MealType;
  quantityG?: number;
  name?: string;
  kcal?: number;
}

/** Alimento propio (POST /brio/foods). Valores por 100 g/ml. */
export interface CreateFoodBody {
  name: string;
  brand?: string;
  isLiquid?: boolean;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  servings?: { label: string; grams: number; isDefault?: boolean }[];
}

export interface MealEntry {
  id: string;
  loggedOn: string;
  mealType: MealType;
  name: string;
  foodId: string | null;
  servingId: string | null;
  quantityG: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DayTotals {
  kcalIn: number;
  kcalBurned: number;
  /** Parte del gasto que cuenta para el día, según Conexiones. */
  kcalBurnedCounted: number;
  kcalTarget: number | null;
  kcalRemaining: number | null;
  proteinG: number;
  carbsG: number;
  fatG: number;
  weightKg: number | null;
}

export interface DaySummary {
  day: string;
  totals: DayTotals;
  meals: MealEntry[];
  sessions: ActivitySession[];
}

export interface Progress {
  from: string;
  to: string;
  weights: { day: string; weightKg: number; bodyFatPct: number | null }[];
  days: {
    day: string;
    kcalIn: number;
    kcalBurned: number;
    kcalTarget: number | null;
    proteinG: number;
    /** Entrenos registrados ese día. */
    sessions: number;
    /** Minutos de entreno ese día. */
    activeMinutes: number;
    /** Momentos del día (desayuno, comida…) con algo registrado. */
    mealsLogged: number;
  }[];
}

export interface LogMealBody {
  mealType: MealType;
  loggedOn?: string;
  foodId?: string;
  servingId?: string;
  quantity: number;
  customName?: string;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

/** Un alimento tal y como se volvería a registrar (su última cantidad). */
export interface HabitItem {
  key: string;
  foodId: string | null;
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  count: number;
  lastOn: string;
}

export interface HabitCombo {
  items: HabitItem[];
  count: number;
  kcal: number;
}

/** Lo de siempre, frecuentes y recientes de un momento del día. */
export interface MealHabits {
  combos: HabitCombo[];
  frequent: HabitItem[];
  recent: HabitItem[];
}

export interface LogActivityBody {
  activityTypeId: string;
  startedAt: string;
  durationSec: number;
  distanceM?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationGainM?: number;
  cadence?: number;
  /** Esfuerzo percibido CR10 (1–10). */
  rpe?: number;
  exercises?: {
    exerciseId: string;
    sets: { weightKg: number; reps: number; rir?: number; restSec?: number; isWarmup?: boolean }[];
  }[];
  /** Segundos en cada zona cardíaca, Z1 a Z5. */
  zoneSeconds?: number[];
  effort?: Effort;
  notes?: string;
}

export interface LogWeightBody {
  weightKg: number;
  measuredOn?: string;
  bodyFatPct?: number;
  waistCm?: number;
  notes?: string;
}

/** Error de la API con su código del catálogo, para distinguir casos. */
export interface BrioApiError {
  code: string;
  message: string;
  status: number;
}

interface RawResult<T> {
  data?: T;
  error?: unknown;
  response?: { status: number };
}

type RawClient = {
  GET: (path: string, init?: unknown) => Promise<RawResult<unknown>>;
  POST: (path: string, init?: unknown) => Promise<RawResult<unknown>>;
  PUT: (path: string, init?: unknown) => Promise<RawResult<unknown>>;
  DELETE: (path: string, init?: unknown) => Promise<RawResult<unknown>>;
  PATCH: (path: string, init?: unknown) => Promise<RawResult<unknown>>;
};

const raw = apiClient as unknown as RawClient;

/** Normaliza el cuerpo de error de la API (`AppExceptionFilter`). */
function toApiError(error: unknown, status: number): BrioApiError {
  const body = error as { code?: string; message?: string } | undefined;
  return {
    code: body?.code ?? 'UNKNOWN',
    message: body?.message ?? 'No se pudo completar la operación.',
    status,
  };
}

export async function call<T>(
  method: keyof RawClient,
  path: string,
  init?: unknown,
): Promise<T> {
  const { data, error, response } = await raw[method](path, init);
  if (error !== undefined || (response && response.status >= 400)) {
    throw toApiError(error, response?.status ?? 0);
  }
  return data as T;
}

export function isApiError(e: unknown): e is BrioApiError {
  return typeof e === 'object' && e !== null && 'code' in e && 'status' in e;
}

export const brioApi = {
  getProfile: () => call<BrioProfile>('GET', '/brio/profile'),
  saveProfile: (body: SaveProfileBody) =>
    call<BrioProfile>('PUT', '/brio/profile', { body }),
  logWeight: (body: LogWeightBody) =>
    call<unknown>('POST', '/brio/weight', { body }),
  getDay: (day?: string) =>
    call<DaySummary>('GET', '/brio/day', {
      params: { query: day ? { day } : {} },
    }),
  getProgress: (days: number) =>
    call<Progress>('GET', '/brio/progress', {
      params: { query: { days } },
    }),
  activityTypes: () => call<ActivityType[]>('GET', '/brio/activity-types'),
  logActivity: (body: LogActivityBody) =>
    call<ActivitySession>('POST', '/brio/activities', { body }),
  deleteActivity: (id: string) =>
    call<void>('DELETE', `/brio/activities/${id}`),
  searchFoods: (q: string) =>
    call<Food[]>('GET', '/brio/foods', { params: { query: { q } } }),
  logMeal: (body: LogMealBody) =>
    call<MealEntry>('POST', '/brio/meals', { body }),
  updateMeal: (id: string, body: UpdateMealBody) =>
    call<MealEntry>('PATCH', `/brio/meals/${id}`, { body }),
  deleteMeal: (id: string) => call<void>('DELETE', `/brio/meals/${id}`),
  createFood: (body: CreateFoodBody) =>
    call<Food>('POST', '/brio/foods', { body }),
  /** Volcado de todo lo guardado en Brío (Perfil › Descargar mis datos). */
  exportMyData: () => call<unknown>('GET', '/brio/account/export'),
  /** Borrado definitivo de la cuenta y de todos sus datos. */
  deleteAccount: () => call<void>('DELETE', '/brio/account'),
  mealHabits: (mealType: MealType) =>
    call<MealHabits>('GET', '/brio/meals/habits', {
      params: { query: { mealType } },
    }),
};
