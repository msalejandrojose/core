import type { MealEntry } from '../../domain/entities/meal-entry.entity';
import type { BrioDiaryRepositoryPort } from '../ports/brio-diary-repository.port';
import type { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';
import { UpdateMealEntryUseCase } from './update-meal-entry.use-case';

const ENTRY: MealEntry = {
  id: 'm1',
  userId: 'u1',
  loggedOn: '2026-11-12',
  mealType: 'LUNCH',
  foodId: 'f1',
  servingId: null,
  name: 'Arroz',
  quantityG: 100,
  kcal: 130,
  proteinG: 2.7,
  carbsG: 28,
  fatG: 0.3,
};

function setup(entry: MealEntry | null = ENTRY) {
  const updateMealEntry = jest
    .fn()
    .mockImplementation((_id: string, _u: string, data: object) =>
      Promise.resolve({ ...ENTRY, ...data }),
    );
  const diary = {
    findMealEntry: jest.fn().mockResolvedValue(entry),
    updateMealEntry,
  } as unknown as BrioDiaryRepositoryPort;
  const refresh = jest
    .fn<Promise<void>, [string, string]>()
    .mockResolvedValue();
  const useCase = new UpdateMealEntryUseCase(diary, {
    execute: refresh,
  } as unknown as RefreshDailyLogUseCase);
  return { useCase, updateMealEntry, refresh };
}

describe('UpdateMealEntryUseCase', () => {
  it('si no es del usuario, no existe', async () => {
    const { useCase } = setup(null);
    await expect(
      useCase.execute('m1', 'u1', { quantityG: 50 }),
    ).rejects.toThrow();
  });

  it('guarda los valores escalados y recalcula el día de la entrada', async () => {
    const { useCase, updateMealEntry, refresh } = setup();
    const out = await useCase.execute('m1', 'u1', { quantityG: 200 });
    expect(updateMealEntry).toHaveBeenCalledWith(
      'm1',
      'u1',
      expect.objectContaining({ quantityG: 200, kcal: 260 }),
    );
    expect(refresh).toHaveBeenCalledWith('u1', '2026-11-12');
    expect(out.kcal).toBe(260);
  });
});
