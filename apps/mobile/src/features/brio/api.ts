import type { components } from '@core/api-client';
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

// Tipos del contrato, sacados del schema OpenAPI generado (`@core/api-client`).
// Si un DTO cambia en la API, el typecheck de la app lo detecta.
type Schemas = components['schemas'];

export type BrioProfile = Schemas['ProfileResponseDto'];
export type SaveProfileBody = Schemas['SaveProfileDto'];
export type Sex = NonNullable<BrioProfile['sex']>;
export type ActivityLevel = BrioProfile['activityLevel'];
export type GoalType = BrioProfile['goalType'];
export type ActivityType = Schemas['ActivityTypeResponseDto'];
export type ActivitySession = Schemas['ActivitySessionResponseDto'];
export type Effort = NonNullable<ActivitySession['effort']>;
export type LogActivityBody = Schemas['LogActivityDto'];
export type FoodServing = Schemas['FoodServingResponseDto'];
export type Food = Schemas['FoodResponseDto'];
export type CreateFoodBody = Schemas['CreateFoodDto'];
export type CreateRecipeBody = Schemas['CreateRecipeDto'];
export type MealEntry = Schemas['MealEntryResponseDto'];
export type MealType = MealEntry['mealType'];
export type LogMealBody = Schemas['LogMealDto'];
export type UpdateMealBody = Schemas['UpdateMealDto'];
export type DayTotals = Schemas['DayTotalsDto'];
export type DaySummary = Schemas['DaySummaryResponseDto'];
export type Progress = Schemas['ProgressResponseDto'];
/** Un alimento tal y como se volvería a registrar (su última cantidad). */
export type HabitItem = Schemas['HabitItemResponseDto'];
export type HabitCombo = Schemas['HabitComboResponseDto'];
/** Lo de siempre, frecuentes y recientes de un momento del día. */
export type MealHabits = Schemas['MealHabitsResponseDto'];
export type LogWeightBody = Schemas['LogWeightDto'];

/** `GET /brio/foods/typical` aún no declara su DTO de respuesta: tipo a mano. */
export interface FoodSection {
  code: string;
  label: string;
  /** Clave de la ilustración (ui/food-icons.data.ts). */
  icon: string;
  foods: Food[];
  /** `world`: «Cocinas del mundo», que se pintan en su propio bloque. */
  group?: 'world' | null;
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

/** Desenvuelve una llamada del cliente tipado: datos o `BrioApiError`. */
async function typed<T>(
  p: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await p;
  if (error !== undefined || response.status >= 400) {
    throw toApiError(error, response.status);
  }
  return data as T;
}

const byId = (id: string) => ({ params: { path: { id } } });

/** Rutas del núcleo de Brío, tipadas de punta a punta por el schema. */
export const brioApi = {
  getProfile: () => typed(apiClient.GET('/brio/profile')),
  saveProfile: (body: SaveProfileBody) => typed(apiClient.PUT('/brio/profile', { body })),
  logWeight: (body: LogWeightBody) => typed(apiClient.POST('/brio/weight', { body })),
  getDay: (day?: string) => typed(apiClient.GET('/brio/day', { params: { query: day ? { day } : {} } })),
  getProgress: (days: number) => typed(apiClient.GET('/brio/progress', { params: { query: { days } } })),
  activityTypes: () => typed(apiClient.GET('/brio/activity-types')),
  logActivity: (body: LogActivityBody) => typed(apiClient.POST('/brio/activities', { body })),
  deleteActivity: (id: string) => typed(apiClient.DELETE('/brio/activities/{id}', byId(id))),
  searchFoods: (q: string) => typed(apiClient.GET('/brio/foods', { params: { query: { q } } })),
  /** Por código de barras: el nuestro o, si no lo tenemos, el de Open Food Facts. */
  foodByBarcode: (barcode: string) =>
    typed(apiClient.GET('/brio/foods', { params: { query: { barcode } } })).then((r) => r[0] ?? null),
  logMeal: (body: LogMealBody) => typed(apiClient.POST('/brio/meals', { body })),
  updateMeal: (id: string, body: UpdateMealBody) => typed(apiClient.PATCH('/brio/meals/{id}', { ...byId(id), body })),
  deleteMeal: (id: string) => typed(apiClient.DELETE('/brio/meals/{id}', byId(id))),
  createFood: (body: CreateFoodBody) => typed(apiClient.POST('/brio/foods', { body })),
  /** Mis recetas (alimentos propios con su «1 ración»), las más nuevas primero. */
  recipes: () => typed(apiClient.GET('/brio/recipes')),
  createRecipe: (body: CreateRecipeBody) => typed(apiClient.POST('/brio/recipes', { body })),
  /** Volcado de todo lo guardado en Brío (Perfil › Descargar mis datos). */
  exportMyData: () => call<unknown>('GET', '/brio/account/export'),
  /** Borrado definitivo de la cuenta y de todos sus datos. */
  deleteAccount: () => typed(apiClient.DELETE('/brio/account')),
  /** Comidas típicas de un momento del día, para apuntar sin buscar. */
  typicalFoods: (mealType: MealType) =>
    call<FoodSection[]>('GET', '/brio/foods/typical', { params: { query: { mealType } } }),
  mealHabits: (mealType: MealType) => typed(apiClient.GET('/brio/meals/habits', { params: { query: { mealType } } })),
};
