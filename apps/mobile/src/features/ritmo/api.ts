import type { components } from '@core/api-client';
import { apiClient } from '@/api/client';

/**
 * Capa de acceso a los endpoints de Ritmo (`/ritmo/*`).
 *
 * Los tipos salen del schema OpenAPI generado de `@core/api-client`
 * (`pnpm --filter @core/api-client generate:offline`, sin API ni BBDD), y las
 * rutas del núcleo (`ritmoApi`) usan el cliente tipado por ruta: si un DTO
 * cambia en la API, el typecheck lo detecta.
 *
 * `call` (sin tipar) queda solo para módulos cuyas rutas aún no declaran el
 * DTO de respuesta en la API (`@ApiOkResponse({ type })`): plan, rendimiento,
 * social, Hevy, Garmin, plantillas y recuperación. Al añadírselo, se pasan a
 * `apiClient` igual que aquí.
 */

// Tipos del contrato, sacados del schema OpenAPI generado (`@core/api-client`).
// Si un DTO cambia en la API, el typecheck de la app lo detecta.
type Schemas = components['schemas'];

export type RitmoProfile = Schemas['ProfileResponseDto'];
export type SaveProfileBody = Schemas['SaveProfileDto'];
export type Sex = NonNullable<RitmoProfile['sex']>;
export type ActivityLevel = RitmoProfile['activityLevel'];
export type GoalType = RitmoProfile['goalType'];
export type ActivityType = Schemas['ActivityTypeResponseDto'];
export type ActivitySession = Schemas['ActivitySessionResponseDto'];
export type Effort = NonNullable<ActivitySession['effort']>;
export type LogActivityBody = Schemas['LogActivityDto'];
export type FoodServing = Schemas['FoodServingResponseDto'];
export type Food = Schemas['FoodResponseDto'];
export type MealEntry = Schemas['MealEntryResponseDto'];
export type MealType = MealEntry['mealType'];
export type LogMealBody = Schemas['LogMealDto'];
export type DayTotals = Schemas['DayTotalsDto'];
export type DaySummary = Schemas['DaySummaryResponseDto'];
export type Progress = Schemas['ProgressResponseDto'];
/** Un alimento tal y como se volvería a registrar (su última cantidad). */
export type HabitItem = Schemas['HabitItemResponseDto'];
export type HabitCombo = Schemas['HabitComboResponseDto'];
/** Lo de siempre, frecuentes y recientes de un momento del día. */
export type MealHabits = Schemas['MealHabitsResponseDto'];
export type LogWeightBody = Schemas['LogWeightDto'];

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
  PATCH: (path: string, init?: unknown) => Promise<RawResult<unknown>>;
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

export function isApiError(e: unknown): e is RitmoApiError {
  return typeof e === 'object' && e !== null && 'code' in e && 'status' in e;
}

/** Desenvuelve una llamada del cliente tipado: datos o `RitmoApiError`. */
async function typed<T>(
  p: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await p;
  if (error !== undefined || response.status >= 400) {
    throw toApiError(error, response.status);
  }
  return data as T;
}

/** Rutas del núcleo de Ritmo, tipadas de punta a punta por el schema. */
export const ritmoApi = {
  getProfile: () => typed(apiClient.GET('/ritmo/profile')),
  saveProfile: (body: SaveProfileBody) =>
    typed(apiClient.PUT('/ritmo/profile', { body })),
  logWeight: (body: LogWeightBody) =>
    typed(apiClient.POST('/ritmo/weight', { body })),
  getDay: (day?: string) =>
    typed(apiClient.GET('/ritmo/day', { params: { query: day ? { day } : {} } })),
  getProgress: (days: number) =>
    typed(apiClient.GET('/ritmo/progress', { params: { query: { days } } })),
  activityTypes: () => typed(apiClient.GET('/ritmo/activity-types')),
  logActivity: (body: LogActivityBody) =>
    typed(apiClient.POST('/ritmo/activities', { body })),
  deleteActivity: (id: string) =>
    typed(apiClient.DELETE('/ritmo/activities/{id}', { params: { path: { id } } })),
  searchFoods: (q: string) =>
    typed(apiClient.GET('/ritmo/foods', { params: { query: { q } } })),
  logMeal: (body: LogMealBody) => typed(apiClient.POST('/ritmo/meals', { body })),
  deleteMeal: (id: string) =>
    typed(apiClient.DELETE('/ritmo/meals/{id}', { params: { path: { id } } })),
  /** Volcado de todo lo guardado en Ritmo (Perfil › Descargar mis datos). */
  exportMyData: () => call<unknown>('GET', '/ritmo/account/export'),
  /** Borrado definitivo de la cuenta y de todos sus datos. */
  deleteAccount: () => typed(apiClient.DELETE('/ritmo/account')),
  mealHabits: (mealType: MealType) =>
    typed(apiClient.GET('/ritmo/meals/habits', { params: { query: { mealType } } })),
};
