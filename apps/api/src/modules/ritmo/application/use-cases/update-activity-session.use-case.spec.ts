import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import type { RitmoActivityRepositoryPort } from '../ports/ritmo-activity-repository.port';
import type { RitmoBodyRepositoryPort } from '../ports/ritmo-body-repository.port';
import type { RitmoProfileRepositoryPort } from '../ports/ritmo-profile-repository.port';
import type { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';
import { UpdateActivitySessionUseCase } from './update-activity-session.use-case';

const SESSION: ActivitySession = {
  id: 's1',
  userId: 'u1',
  activityTypeId: 't1',
  activityTypeName: 'Correr',
  startedAt: new Date('2026-11-10T07:00:00.000Z'),
  loggedOn: '2026-11-10',
  durationSec: 1800,
  distanceM: 5000,
  avgHeartRate: 150,
  maxHeartRate: null,
  elevationGainM: null,
  cadence: null,
  rpe: null,
  zoneSeconds: null,
  kind: 'RUN',
  sets: [],
  effort: 'MODERATE',
  kcalBurned: 400,
  notes: null,
  source: 'MANUAL',
};

function setup(session: ActivitySession | null = SESSION) {
  const updateSession = jest.fn().mockResolvedValue(true);
  const activity = {
    findSession: jest.fn().mockResolvedValue(session),
    findTypeVisibleTo: jest.fn().mockResolvedValue({ id: 't1', met: 10 }),
    updateSession,
  } as unknown as RitmoActivityRepositoryPort;
  const body = {
    latestWeightKg: jest.fn().mockResolvedValue(80),
  } as unknown as RitmoBodyRepositoryPort;
  const profiles = {
    findByUserId: jest.fn().mockResolvedValue({ timezone: 'Europe/Madrid' }),
  } as unknown as RitmoProfileRepositoryPort;
  const refresh = jest
    .fn<Promise<void>, [string, string]>()
    .mockResolvedValue();
  const useCase = new UpdateActivitySessionUseCase(activity, body, profiles, {
    execute: refresh,
  } as unknown as RefreshDailyLogUseCase);
  return { useCase, updateSession, refresh };
}

describe('UpdateActivitySessionUseCase', () => {
  it('si no es del usuario, no existe', async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute('s1', 'u1', { rpe: 7 })).rejects.toThrow(
      'no encontrada',
    );
  });

  it('cambia solo lo que se manda y no toca las kcal si no cambia la duración', async () => {
    const { useCase, updateSession, refresh } = setup();
    await useCase.execute('s1', 'u1', { rpe: 7, distanceM: null });
    expect(updateSession).toHaveBeenCalledWith('s1', 'u1', {
      rpe: 7,
      distanceM: null,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('u1', '2026-11-10');
  });

  it('reestima las kcal si cambia la duración o el esfuerzo', async () => {
    const { useCase, updateSession } = setup();
    await useCase.execute('s1', 'u1', { durationSec: 3600 });
    // MET 10 × 3,5 × 80 kg / 200 = 14 kcal/min × 60 min.
    expect(updateSession).toHaveBeenCalledWith(
      's1',
      'u1',
      expect.objectContaining({ durationSec: 3600, kcalBurned: 840 }),
    );
  });

  it('si cambia de día, refresca el día viejo y el nuevo', async () => {
    const { useCase, updateSession, refresh } = setup();
    await useCase.execute('s1', 'u1', {
      startedAt: new Date('2026-11-08T07:00:00.000Z'),
    });
    expect(updateSession).toHaveBeenCalledWith(
      's1',
      'u1',
      expect.objectContaining({ loggedOn: '2026-11-08' }),
    );
    expect(refresh.mock.calls.map((c) => c[1])).toEqual([
      '2026-11-10',
      '2026-11-08',
    ]);
  });
});
