/* eslint-disable @typescript-eslint/require-await -- dobles de prueba: métodos async sin await */
import type { PlannedSession } from '../../domain/entities/plan.entity';
import {
  ApplyRecoveryOptionUseCase,
  GetRecoveryUseCase,
} from './recovery.use-cases';

const USER = 'u1';
const TODAY = '2026-11-13';

const planned = (
  day: string,
  over: Partial<PlannedSession> = {},
): PlannedSession =>
  ({
    id: `p-${day}`,
    day,
    kind: 'RUN',
    templateCode: 'series',
    title: 'Series 6 × 800 m',
    load: 'HIGH',
    startTime: '07:30',
    plannedDurationMin: 55,
    plannedDistanceM: null,
    targetPaceSecPerKm: null,
    structure: null,
    notes: null,
    completedAt: null,
    completedSessionId: null,
    actualNotes: null,
    skipped: false,
    ...over,
  }) as PlannedSession;

function setup(loadStatus: string, plan: PlannedSession[]) {
  const store = new Map(plan.map((p) => [p.day, p]));
  const plans = {
    findActivePlan: async () => ({ id: 'PLAN' }),
    plannedBetween: async (_u: string, from: string, to: string) =>
      [...store.values()].filter((p) => p.day >= from && p.day <= to),
    findPlanned: async (_u: string, day: string) => store.get(day) ?? null,
    upsertPlanned: async (
      _u: string,
      day: string,
      _p: string | null,
      data: object,
    ) => {
      const row = { ...planned(day), ...data, day };
      store.set(day, row);
      return row;
    },
    deletePlanned: async (_u: string, day: string) => store.delete(day),
  };
  const health = { dailyHealth: async () => [] };
  const loader = { load: async () => ({ today: TODAY }) };
  const fatigue = {
    execute: async () => ({
      load: { status: loadStatus, ratio: 1.4, weekChangePct: 22 },
      demanding: { last7: 0 },
      rest: { currentStreakDays: 0 },
    }),
  };
  const get = new GetRecoveryUseCase(
    health as never,
    plans as never,
    loader as never,
    fatigue as never,
  );
  return {
    get,
    apply: new ApplyRecoveryOptionUseCase(plans as never, get),
    store,
  };
}

describe('GetRecoveryUseCase', () => {
  it('sin reloj puntúa con la carga y propone sobre la sesión de mañana', async () => {
    const { get } = setup('ABOVE_USUAL', [planned('2026-11-14')]);
    const r = await get.execute(USER);
    expect(r).toMatchObject({
      score: 64,
      level: 'MODERATE',
      hasHealthData: false,
      limiting: 'LOAD',
    });
    expect(r.tomorrow).toMatchObject({
      day: '2026-11-14',
      title: 'Series 6 × 800 m',
    });
    expect(r.options.map((o) => o.id)).toEqual(['EASY', 'MOVE', 'KEEP']);
  });
});

describe('ApplyRecoveryOptionUseCase', () => {
  it('suavizar cambia las series por un rodaje suave a la misma hora', async () => {
    const { apply, store } = setup('ABOVE_USUAL', [planned('2026-11-14')]);
    const r = await apply.execute(USER, 'EASY');
    expect(store.get('2026-11-14')).toMatchObject({
      templateCode: 'z2',
      title: 'Rodaje suave',
      plannedDurationMin: 35,
      startTime: '07:30',
      load: 'MEDIUM',
    });
    // Ya suavizada, lo que queda es moverla o dejarla.
    expect(r.options.map((o) => o.id)).toEqual(['MOVE', 'KEEP']);
  });

  it('mover intercambia mañana con el día siguiente', async () => {
    const { apply, store } = setup('ABOVE_USUAL', [
      planned('2026-11-14'),
      planned('2026-11-15', {
        templateCode: 'mov',
        title: 'Movilidad',
        load: 'LOW',
        kind: 'OTHER',
      }),
    ]);
    await apply.execute(USER, 'MOVE');
    expect(store.get('2026-11-15')?.title).toBe('Series 6 × 800 m');
    expect(store.get('2026-11-14')?.title).toBe('Movilidad');
  });

  it('mover a un día vacío deja mañana libre', async () => {
    const { apply, store } = setup('ABOVE_USUAL', [planned('2026-11-14')]);
    await apply.execute(USER, 'MOVE');
    expect(store.has('2026-11-14')).toBe(false);
    expect(store.get('2026-11-15')?.title).toBe('Series 6 × 800 m');
  });

  it('rechaza una opción que no se ofrece', async () => {
    const { apply } = setup('USUAL', [planned('2026-11-14')]);
    await expect(apply.execute(USER, 'REST')).rejects.toThrow(
      'BRIO_RECOVERY_OPTION_UNAVAILABLE',
    );
  });

  it('mantener no toca el plan', async () => {
    const { apply, store } = setup('ABOVE_USUAL', [planned('2026-11-14')]);
    await apply.execute(USER, 'KEEP');
    expect(store.get('2026-11-14')?.title).toBe('Series 6 × 800 m');
  });
});
