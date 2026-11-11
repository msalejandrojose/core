import { apiClient } from '@/api/client';

/**
 * Capa de acceso a los endpoints de Ritmo (`/ritmo/*`).
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

export interface RitmoProfile {
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

export interface LogActivityBody {
  activityTypeId: string;
  startedAt: string;
  durationSec: number;
  distanceM?: number;
  avgHeartRate?: number;
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
export interface RitmoApiError {
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
};

const raw = apiClient as unknown as RawClient;

/** Normaliza el cuerpo de error de la API (`AppExceptionFilter`). */
function toApiError(error: unknown, status: number): RitmoApiError {
  const body = error as { code?: string; message?: string } | undefined;
  return {
    code: body?.code ?? 'UNKNOWN',
    message: body?.message ?? 'No se pudo completar la operación.',
    status,
  };
}

async function call<T>(
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

export function isApiError(e: unknown): e is RitmoApiError {
  return typeof e === 'object' && e !== null && 'code' in e && 'status' in e;
}

export const ritmoApi = {
  getProfile: () => call<RitmoProfile>('GET', '/ritmo/profile'),
  saveProfile: (body: SaveProfileBody) =>
    call<RitmoProfile>('PUT', '/ritmo/profile', { body }),
  logWeight: (body: LogWeightBody) =>
    call<unknown>('POST', '/ritmo/weight', { body }),
  getDay: (day?: string) =>
    call<DaySummary>('GET', '/ritmo/day', {
      params: { query: day ? { day } : {} },
    }),
  getProgress: (days: number) =>
    call<Progress>('GET', '/ritmo/progress', {
      params: { query: { days } },
    }),
  activityTypes: () => call<ActivityType[]>('GET', '/ritmo/activity-types'),
  logActivity: (body: LogActivityBody) =>
    call<ActivitySession>('POST', '/ritmo/activities', { body }),
  deleteActivity: (id: string) =>
    call<void>('DELETE', `/ritmo/activities/${id}`),
  searchFoods: (q: string) =>
    call<Food[]>('GET', '/ritmo/foods', { params: { query: { q } } }),
  logMeal: (body: LogMealBody) =>
    call<MealEntry>('POST', '/ritmo/meals', { body }),
  deleteMeal: (id: string) => call<void>('DELETE', `/ritmo/meals/${id}`),
};
