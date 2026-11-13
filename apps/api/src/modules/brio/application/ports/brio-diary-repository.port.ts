import type { DailyLog } from '../../domain/entities/daily-log.entity';
import type {
  MealEntry,
  MealType,
} from '../../domain/entities/meal-entry.entity';

/** Cuántos momentos del día (desayuno, comida…) tienen algo registrado. */
export interface DayMealCount {
  day: string;
  mealsLogged: number;
}

export const BRIO_DIARY_REPOSITORY = Symbol('BRIO_DIARY_REPOSITORY');

export interface CreateMealEntryData {
  userId: string;
  loggedOn: string;
  mealType: MealType;
  foodId: string | null;
  servingId: string | null;
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Totales de ingesta de un día, calculados en BBDD. */
export interface DayIntakeTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DailyLogPatch {
  kcalIn: number;
  kcalBurned: number;
  kcalTarget: number | null;
  proteinG: number;
  carbsG: number;
  fatG: number;
  weightKg: number | null;
}

export interface BrioDiaryRepositoryPort {
  createMealEntry(data: CreateMealEntryData): Promise<MealEntry>;
  /** Una entrada, solo si es del usuario. */
  findMealEntry(id: string, userId: string): Promise<MealEntry | null>;
  /** `false` si la entrada no existía o no era del usuario. */
  deleteMealEntry(id: string, userId: string): Promise<boolean>;
  listMealEntriesByDay(userId: string, day: string): Promise<MealEntry[]>;
  /** Entradas de un momento del día desde `fromDay` (incluido), para hábitos. */
  listMealEntriesSince(
    userId: string,
    fromDay: string,
    mealType: MealType,
  ): Promise<MealEntry[]>;
  sumIntakeByDay(userId: string, day: string): Promise<DayIntakeTotals>;
  findDailyLog(userId: string, day: string): Promise<DailyLog | null>;
  /** Alta o actualización del agregado del día (idempotente por usuario+día). */
  upsertDailyLog(
    userId: string,
    day: string,
    patch: DailyLogPatch,
  ): Promise<DailyLog>;
  listDailyLogsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<DailyLog[]>;
  /** Momentos registrados por día entre dos días. Solo días con alguna comida. */
  mealCountsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<DayMealCount[]>;
}
