import { Inject, Injectable } from '@nestjs/common';
import type {
  MealEntry,
  MealType,
} from '../../domain/entities/meal-entry.entity';
import { NutreFoodNotFoundError } from '../../domain/errors/nutre-food-not-found.error';
import { dayInTimezone } from '../../domain/services/calendar';
import { scaleMacros } from '../../domain/services/energy';
import {
  NUTRE_DIARY_REPOSITORY,
  type NutreDiaryRepositoryPort,
} from '../ports/nutre-diary-repository.port';
import {
  NUTRE_FOOD_REPOSITORY,
  type NutreFoodRepositoryPort,
} from '../ports/nutre-food-repository.port';
import {
  NUTRE_PROFILE_REPOSITORY,
  type NutreProfileRepositoryPort,
} from '../ports/nutre-profile-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/**
 * Registrar comida. Dos caminos, a propósito:
 *
 *  - Con `foodId`: se escalan los valores del catálogo por la cantidad y se
 *    guardan como snapshot.
 *  - Con `customName` + kcal (y macros opcionales): registro rápido sin
 *    catálogo. Sin esto la app se vuelve un trabajo de contabilidad y la gente
 *    la abandona a la semana.
 */
export interface LogMealEntryInput {
  userId: string;
  /** Día del diario; si falta, hoy en la zona horaria del perfil. */
  loggedOn?: string;
  mealType: MealType;
  foodId?: string;
  servingId?: string;
  /** Cantidad en g/ml; con ración, se multiplica por sus gramos. */
  quantity: number;
  customName?: string;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

@Injectable()
export class LogMealEntryUseCase {
  constructor(
    @Inject(NUTRE_DIARY_REPOSITORY)
    private readonly diary: NutreDiaryRepositoryPort,
    @Inject(NUTRE_FOOD_REPOSITORY)
    private readonly foods: NutreFoodRepositoryPort,
    @Inject(NUTRE_PROFILE_REPOSITORY)
    private readonly profiles: NutreProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(input: LogMealEntryInput): Promise<MealEntry> {
    const profile = await this.profiles.findByUserId(input.userId);
    const loggedOn =
      input.loggedOn ??
      dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid');

    const entry = input.foodId
      ? await this.fromCatalog(input, input.foodId, loggedOn)
      : this.fromFreeText(input, loggedOn);

    const created = await this.diary.createMealEntry(entry);
    await this.refreshDailyLog.execute(input.userId, loggedOn);
    return created;
  }

  private async fromCatalog(
    input: LogMealEntryInput,
    foodId: string,
    loggedOn: string,
  ) {
    const food = await this.foods.findVisibleTo(foodId, input.userId);
    if (!food) throw new NutreFoodNotFoundError(foodId);

    // Con ración elegida, `quantity` son unidades de esa ración (1.5 rebanadas);
    // sin ración, son gramos directos.
    const serving = input.servingId
      ? food.servings.find((s) => s.id === input.servingId)
      : undefined;
    const quantityG = serving ? serving.grams * input.quantity : input.quantity;

    return {
      userId: input.userId,
      loggedOn,
      mealType: input.mealType,
      foodId: food.id,
      servingId: serving?.id ?? null,
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      quantityG,
      ...scaleMacros(food, quantityG),
    };
  }

  private fromFreeText(input: LogMealEntryInput, loggedOn: string) {
    return {
      userId: input.userId,
      loggedOn,
      mealType: input.mealType,
      foodId: null,
      servingId: null,
      name: input.customName?.trim() || 'Comida',
      quantityG: input.quantity,
      kcal: Math.round(input.kcal ?? 0),
      proteinG: input.proteinG ?? 0,
      carbsG: input.carbsG ?? 0,
      fatG: input.fatG ?? 0,
    };
  }
}
