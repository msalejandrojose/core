import { Inject, Injectable } from '@nestjs/common';
import type { MealType } from '../../domain/entities/meal-entry.entity';
import { dayInTimezone, shiftDay } from '../../domain/services/calendar';
import { mealHabits, type MealHabits } from '../../domain/services/habits';
import {
  RITMO_DIARY_REPOSITORY,
  type RitmoDiaryRepositoryPort,
} from '../ports/ritmo-diary-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';

/**
 * Ventana de historial para los hábitos. Tres meses: suficiente para que "lo
 * de siempre" sea estable, y corto para que un cambio de dieta se note pronto.
 */
export const HABITS_WINDOW_DAYS = 90;

/**
 * Lo de siempre, frecuentes y recientes de un momento del día (desayuno,
 * comida, merienda o cena). Alimenta "Ahora toca" en Hoy, la hoja Registrar
 * y la de Añadir alimento.
 */
@Injectable()
export class GetMealHabitsUseCase {
  constructor(
    @Inject(RITMO_DIARY_REPOSITORY)
    private readonly diary: RitmoDiaryRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async execute(userId: string, mealType: MealType): Promise<MealHabits> {
    const profile = await this.profiles.findByUserId(userId);
    const today = dayInTimezone(
      new Date(),
      profile?.timezone ?? 'Europe/Madrid',
    );
    const entries = await this.diary.listMealEntriesSince(
      userId,
      shiftDay(today, -HABITS_WINDOW_DAYS),
      mealType,
    );
    return mealHabits(entries, mealType);
  }
}
