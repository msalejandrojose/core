import { Inject, Injectable } from '@nestjs/common';
import type { MealEntry } from '../../domain/entities/meal-entry.entity';
import { BrioMealEntryNotFoundError } from '../../domain/errors/brio-meal-entry-not-found.error';
import {
  editMealEntry,
  type MealEntryPatch,
} from '../../domain/services/meal-edit';
import {
  BRIO_DIARY_REPOSITORY,
  type BrioDiaryRepositoryPort,
} from '../ports/brio-diary-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/**
 * Corregir una entrada del diario: la cantidad, el momento del día o, en un
 * registro rápido, el nombre y las kcal. Después se recalcula el día.
 */
@Injectable()
export class UpdateMealEntryUseCase {
  constructor(
    @Inject(BRIO_DIARY_REPOSITORY)
    private readonly diary: BrioDiaryRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(
    id: string,
    userId: string,
    patch: MealEntryPatch,
  ): Promise<MealEntry> {
    const entry = await this.diary.findMealEntry(id, userId);
    if (!entry) throw new BrioMealEntryNotFoundError(id);

    const updated = await this.diary.updateMealEntry(
      id,
      userId,
      editMealEntry(entry, patch),
    );
    if (!updated) throw new BrioMealEntryNotFoundError(id);

    await this.refreshDailyLog.execute(userId, entry.loggedOn);
    return updated;
  }
}
