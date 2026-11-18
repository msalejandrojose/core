import { RitmoActivitySessionNotFoundError } from '../../domain/errors/ritmo-activity-session-not-found.error';
import { RitmoExerciseNotFoundError } from '../../domain/errors/ritmo-exercise-not-found.error';
import { RitmoFoodNotFoundError } from '../../domain/errors/ritmo-food-not-found.error';
import { RitmoMealEntryNotFoundError } from '../../domain/errors/ritmo-meal-entry-not-found.error';
import { RitmoWeightUnknownError } from '../../domain/errors/ritmo-weight-unknown.error';
import {
  computeEnergyTargets,
  sessionKcal,
} from '../../domain/services/energy';
import type { RitmoActivityRepositoryPort } from '../ports/ritmo-activity-repository.port';
import type { RitmoBodyRepositoryPort } from '../ports/ritmo-body-repository.port';
import type { RitmoDiaryRepositoryPort } from '../ports/ritmo-diary-repository.port';
import type { RitmoFoodRepositoryPort } from '../ports/ritmo-food-repository.port';
import type { RitmoPerformanceRepositoryPort } from '../ports/ritmo-performance-repository.port';
import type {
  RitmoProfileRepositoryPort,
  SaveProfileData,
} from '../ports/ritmo-profile-repository.port';
import { DeleteActivitySessionUseCase } from './delete-activity-session.use-case';
import { DeleteMealEntryUseCase } from './delete-meal-entry.use-case';
import { LogActivitySessionUseCase } from './log-activity-session.use-case';
import { LogMealEntryUseCase } from './log-meal-entry.use-case';
import { LogWeightUseCase } from './log-weight.use-case';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';
import { SaveMyProfileUseCase } from './save-my-profile.use-case';

/**
 * Casos de uso del núcleo (diario, actividad, peso, perfil) con los puertos
 * simulados: qué día natural se apunta, que el diario se recalcula tras cada
 * escritura y borrado, que nadie borra lo de otro y que los objetivos salen
 * de la pesada más reciente.
 */

const USER = 'u1';
const PROFILE = {
  id: 'p1',
  userId: USER,
  sex: 'FEMALE' as const,
  birthDate: '1992-04-10',
  heightCm: 166,
  activityLevel: 'MODERATE' as const,
  goalType: 'LOSE_WEIGHT' as const,
  targetWeightKg: 64,
  weeklyWeightChangeKg: -0.5,
  timezone: 'Europe/Madrid',
  dailyKcalTarget: 1631,
};

function ports(
  opts: { weight?: number | null; profile?: typeof PROFILE | null } = {},
) {
  const profile = opts.profile === undefined ? PROFILE : opts.profile;
  const weight = opts.weight === undefined ? 70 : opts.weight;
  const diary = {
    createMealEntry: jest.fn((e: object) =>
      Promise.resolve({ id: 'm1', ...e }),
    ),
    findMealEntry: jest.fn(),
    deleteMealEntry: jest.fn(() => Promise.resolve()),
    sumIntakeByDay: jest.fn(() =>
      Promise.resolve({ kcal: 1200, proteinG: 90, carbsG: 120, fatG: 40 }),
    ),
    upsertDailyLog: jest.fn((userId: string, day: string, data: object) =>
      Promise.resolve({ userId, day, ...data }),
    ),
  };
  const activity = {
    findTypeVisibleTo: jest.fn(() => Promise.resolve({ id: 't-run', met: 9 })),
    createSession: jest.fn((s: object) => Promise.resolve({ id: 's1', ...s })),
    findSession: jest.fn(),
    deleteSession: jest.fn(() => Promise.resolve()),
    sumKcalByDay: jest.fn(() => Promise.resolve(540)),
  };
  const body = {
    latestWeightKg: jest.fn(() => Promise.resolve(weight)),
    save: jest.fn((d: object) => Promise.resolve({ id: 'w1', ...d })),
    listBetween: jest.fn(() =>
      Promise.resolve(weight === null ? [] : [{ weightKg: weight }]),
    ),
  };
  const profiles = {
    findByUserId: jest.fn(() => Promise.resolve(profile)),
    updateTargets: jest.fn(() => Promise.resolve()),
    save: jest.fn((d: object, t: object) =>
      Promise.resolve({ ...PROFILE, ...d, ...t }),
    ),
  };
  const foods = { findVisibleTo: jest.fn() };
  const performance = {
    missingExercises: jest.fn(() => Promise.resolve([] as string[])),
  };

  const refresh = new RefreshDailyLogUseCase(
    diary as unknown as RitmoDiaryRepositoryPort,
    activity as unknown as RitmoActivityRepositoryPort,
    profiles as unknown as RitmoProfileRepositoryPort,
    body as unknown as RitmoBodyRepositoryPort,
  );
  const refreshSpy = jest.spyOn(refresh, 'execute');
  return {
    diary,
    activity,
    body,
    profiles,
    foods,
    performance,
    refresh,
    refreshSpy,
    logMeal: new LogMealEntryUseCase(
      diary as unknown as RitmoDiaryRepositoryPort,
      foods as unknown as RitmoFoodRepositoryPort,
      profiles as unknown as RitmoProfileRepositoryPort,
      refresh,
    ),
    deleteMeal: new DeleteMealEntryUseCase(
      diary as unknown as RitmoDiaryRepositoryPort,
      refresh,
    ),
    logActivity: new LogActivitySessionUseCase(
      activity as unknown as RitmoActivityRepositoryPort,
      body as unknown as RitmoBodyRepositoryPort,
      profiles as unknown as RitmoProfileRepositoryPort,
      performance as unknown as RitmoPerformanceRepositoryPort,
      refresh,
    ),
    deleteActivity: new DeleteActivitySessionUseCase(
      activity as unknown as RitmoActivityRepositoryPort,
      refresh,
    ),
    logWeight: new LogWeightUseCase(
      body as unknown as RitmoBodyRepositoryPort,
      profiles as unknown as RitmoProfileRepositoryPort,
      refresh,
    ),
    saveProfile: new SaveMyProfileUseCase(
      profiles as unknown as RitmoProfileRepositoryPort,
      body as unknown as RitmoBodyRepositoryPort,
    ),
  };
}

const run = (overrides: object = {}) => ({
  userId: USER,
  activityTypeId: 't-run',
  startedAt: new Date('2026-11-18T08:00:00Z'),
  durationSec: 2700,
  distanceM: null,
  avgHeartRate: null,
  effort: 'MODERATE' as const,
  notes: null,
  ...overrides,
});

afterEach(() => jest.useRealTimers());

describe('día natural según la zona horaria del perfil', () => {
  it('una comida a las 00:30 en Madrid es del día nuevo aunque en UTC sea el anterior', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-17T23:30:00Z') }); // 00:30 del 18 en Madrid (UTC+1)
    const p = ports();
    await p.logMeal.execute({
      userId: USER,
      mealType: 'SNACK',
      quantity: 100,
      customName: 'Yogur',
      kcal: 90,
    });
    expect(p.diary.createMealEntry).toHaveBeenCalledWith(
      expect.objectContaining({ loggedOn: '2026-11-18' }),
    );
    expect(p.refreshSpy).toHaveBeenCalledWith(USER, '2026-11-18');
  });

  it('un entreno que empieza a las 23:30 UTC cuenta para el día siguiente en Madrid', async () => {
    const p = ports();
    await p.logActivity.execute(
      run({ startedAt: new Date('2026-11-17T23:30:00Z') }),
    );
    expect(p.activity.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ loggedOn: '2026-11-18' }),
    );
    expect(p.refreshSpy).toHaveBeenCalledWith(USER, '2026-11-18');
  });

  it('sin perfil se usa Madrid; con loggedOn explícito se respeta', async () => {
    jest.useFakeTimers({ now: new Date('2026-07-01T22:30:00Z') }); // 00:30 del 2 en verano (UTC+2)
    const p = ports({ profile: null });
    await p.logMeal.execute({ userId: USER, mealType: 'DINNER', quantity: 1 });
    expect(p.diary.createMealEntry).toHaveBeenLastCalledWith(
      expect.objectContaining({ loggedOn: '2026-07-02' }),
    );
    await p.logMeal.execute({
      userId: USER,
      mealType: 'LUNCH',
      quantity: 1,
      loggedOn: '2026-06-30',
    });
    expect(p.diary.createMealEntry).toHaveBeenLastCalledWith(
      expect.objectContaining({ loggedOn: '2026-06-30' }),
    );
  });
});

describe('comidas', () => {
  it('con ración, la cantidad son unidades de la ración y los macros se escalan', async () => {
    const p = ports();
    p.foods.findVisibleTo.mockResolvedValue({
      id: 'f1',
      name: 'Pan integral',
      brand: 'Horno',
      kcalPer100: 250,
      proteinPer100G: 10,
      carbsPer100G: 45,
      fatPer100G: 3,
      servings: [{ id: 'rebanada', grams: 30 }],
    });
    await p.logMeal.execute({
      userId: USER,
      mealType: 'BREAKFAST',
      foodId: 'f1',
      servingId: 'rebanada',
      quantity: 2,
      loggedOn: '2026-11-18',
    });
    expect(p.diary.createMealEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Pan integral (Horno)',
        quantityG: 60,
        kcal: 150,
        servingId: 'rebanada',
      }),
    );
  });

  it('un alimento que no ve el usuario no se puede apuntar y no toca el diario', async () => {
    const p = ports();
    p.foods.findVisibleTo.mockResolvedValue(null);
    await expect(
      p.logMeal.execute({
        userId: USER,
        mealType: 'LUNCH',
        foodId: 'ajeno',
        quantity: 100,
      }),
    ).rejects.toBeInstanceOf(RitmoFoodNotFoundError);
    expect(p.diary.createMealEntry).not.toHaveBeenCalled();
    expect(p.refreshSpy).not.toHaveBeenCalled();
  });

  it('borrar recalcula el día de la comida; lo de otro usuario no se borra', async () => {
    const p = ports();
    p.diary.findMealEntry.mockImplementation((id: string, userId: string) =>
      Promise.resolve(
        id === 'mia' && userId === USER ? { id, loggedOn: '2026-11-15' } : null,
      ),
    );
    await p.deleteMeal.execute('mia', USER);
    expect(p.diary.deleteMealEntry).toHaveBeenCalledWith('mia', USER);
    expect(p.refreshSpy).toHaveBeenCalledWith(USER, '2026-11-15');

    await expect(p.deleteMeal.execute('de-otro', USER)).rejects.toBeInstanceOf(
      RitmoMealEntryNotFoundError,
    );
    expect(p.diary.deleteMealEntry).toHaveBeenCalledTimes(1);
  });
});

describe('actividad', () => {
  it('sin peso conocido no se registra (no hay con qué estimar las kcal)', async () => {
    const p = ports({ weight: null });
    await expect(p.logActivity.execute(run())).rejects.toBeInstanceOf(
      RitmoWeightUnknownError,
    );
    expect(p.activity.createSession).not.toHaveBeenCalled();
    expect(p.refreshSpy).not.toHaveBeenCalled();
  });

  it('las kcal las calcula el servidor con el MET y el último peso', async () => {
    const p = ports({ weight: 70 });
    await p.logActivity.execute(run());
    const expected = sessionKcal({
      met: 9,
      weightKg: 70,
      durationSec: 2700,
      effort: 'MODERATE',
    });
    expect(p.activity.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ kcalBurned: expected }),
    );
  });

  it('un ejercicio que el usuario no puede ver aborta el registro', async () => {
    const p = ports();
    p.performance.missingExercises.mockResolvedValue(['ajeno']);
    await expect(
      p.logActivity.execute(
        run({
          sets: [
            {
              exerciseId: 'ajeno',
              exerciseOrder: 0,
              setOrder: 0,
              weightKg: 50,
              reps: 5,
              rir: null,
              restSec: null,
              isWarmup: false,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(RitmoExerciseNotFoundError);
    expect(p.activity.createSession).not.toHaveBeenCalled();
  });

  it('borrar recalcula su día; un entreno de otro no se borra', async () => {
    const p = ports();
    p.activity.findSession.mockImplementation((id: string, userId: string) =>
      Promise.resolve(
        id === 'mio' && userId === USER ? { id, loggedOn: '2026-11-16' } : null,
      ),
    );
    await p.deleteActivity.execute('mio', USER);
    expect(p.activity.deleteSession).toHaveBeenCalledWith('mio', USER);
    expect(p.refreshSpy).toHaveBeenCalledWith(USER, '2026-11-16');
    await expect(
      p.deleteActivity.execute('de-otro', USER),
    ).rejects.toBeInstanceOf(RitmoActivitySessionNotFoundError);
    expect(p.activity.deleteSession).toHaveBeenCalledTimes(1);
  });
});

describe('peso y objetivos', () => {
  it('una pesada atrasada no cambia los objetivos: se calculan con la más reciente', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-18T10:00:00Z') });
    const p = ports({ weight: 68 }); // la más reciente sigue siendo 68
    await p.logWeight.execute({
      userId: USER,
      weightKg: 72,
      measuredOn: '2026-11-01',
    });
    const expected = computeEnergyTargets({
      ...PROFILE,
      weightKg: 68,
      today: new Date(),
    })!;
    expect(p.profiles.updateTargets).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({
        dailyKcalTarget: expected.dailyKcalTarget,
        tdeeKcal: expected.tdeeKcal,
      }),
    );
    expect(p.refreshSpy).toHaveBeenCalledWith(USER, '2026-11-01');
  });

  it('sin perfil se guarda la pesada pero no hay objetivos que recalcular', async () => {
    const p = ports({ profile: null });
    await p.logWeight.execute({
      userId: USER,
      weightKg: 70,
      measuredOn: '2026-11-18',
    });
    expect(p.body.save).toHaveBeenCalled();
    expect(p.profiles.updateTargets).not.toHaveBeenCalled();
  });

  it('guardar el perfil sin peso deja los objetivos a null pero conserva el ritmo elegido', async () => {
    const p = ports({ weight: null });
    const data: SaveProfileData = { ...PROFILE, userId: USER };
    await p.saveProfile.execute(data);
    expect(p.profiles.save).toHaveBeenCalledWith(
      data,
      expect.objectContaining({
        dailyKcalTarget: null,
        tdeeKcal: null,
        weeklyWeightChangeKg: -0.5,
      }),
    );
  });

  it('con peso, el perfil sale con objetivos y el ritmo acotado por el dominio', async () => {
    const p = ports({ weight: 70 });
    const res = await p.saveProfile.execute({
      ...PROFILE,
      userId: USER,
      weeklyWeightChangeKg: -3,
    });
    const [, targets] = p.profiles.save.mock.calls[0] as unknown as [
      unknown,
      { dailyKcalTarget: number; weeklyWeightChangeKg: number },
    ];
    expect(targets.dailyKcalTarget).toBeGreaterThan(0);
    expect(Math.abs(targets.weeklyWeightChangeKg)).toBeLessThanOrEqual(1);
    expect(res.currentWeightKg).toBe(70);
  });
});

describe('recálculo del diario', () => {
  it('guarda lo comido, lo gastado, el objetivo vigente (snapshot) y el peso del día', async () => {
    const p = ports({ weight: 69.5 });
    await p.refresh.execute(USER, '2026-11-18');
    expect(p.diary.upsertDailyLog).toHaveBeenCalledWith(USER, '2026-11-18', {
      kcalIn: 1200,
      kcalBurned: 540,
      kcalTarget: 1631,
      proteinG: 90,
      carbsG: 120,
      fatG: 40,
      weightKg: 69.5,
    });
  });

  it('sin perfil ni pesada ese día, objetivo y peso van a null', async () => {
    const p = ports({ profile: null, weight: null });
    await p.refresh.execute(USER, '2026-11-18');
    expect(p.diary.upsertDailyLog).toHaveBeenCalledWith(
      USER,
      '2026-11-18',
      expect.objectContaining({ kcalTarget: null, weightKg: null }),
    );
  });
});
