import { Inject, Injectable } from '@nestjs/common';
import { NutreMealEntryNotFoundError } from '../../domain/errors/nutre-meal-entry-not-found.error';
import {
  NUTRE_DIARY_REPOSITORY,
  type NutreDiaryRepositoryPort,
} from '../ports/nutre-diary-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/**
 * Borra una entrada del diario. Se lee antes para quedarse con su `loggedOn` y
 * poder refrescar el agregado de ese día: el cliente no tiene por qué mandar la
 * fecha de algo que ya identificó por id.
 */
@Injectable()
export class DeleteMealEntryUseCase {
  constructor(
    @Inject(NUTRE_DIARY_REPOSITORY)
    private readonly diary: NutreDiaryRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const entry = await this.diary.findMealEntry(id, userId);
    if (!entry) throw new NutreMealEntryNotFoundError(id);

    await this.diary.deleteMealEntry(id, userId);
    await this.refreshDailyLog.execute(userId, entry.loggedOn);
  }
}
