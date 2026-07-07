import { WorkflowSchedulerService } from './workflow-scheduler.service';
import { WorkflowTrigger } from '../../domain/entities/workflow-trigger.entity';

const cronTrigger: WorkflowTrigger = {
  id: 'trig-1',
  definitionId: 'def-1',
  kind: 'CRON',
  eventType: null,
  matchExpression: null,
  cronExpression: '0 9 * * *',
  cronPayload: { source: 'daily' },
  nextFireAt: new Date('2026-07-04T09:00:00.000Z'),
  target: { type: 'users', filter: { isActive: true } },
};

describe('WorkflowSchedulerService', () => {
  let triggers: {
    findDueCronTriggers: jest.Mock;
    claimCronSlot: jest.Mock;
  };
  let definitions: { findById: jest.Mock };
  let events: { create: jest.Mock };
  let cron: { next: jest.Mock; isValid: jest.Mock };
  let start: { execute: jest.Mock };
  let resume: { execute: jest.Mock };
  let scheduler: WorkflowSchedulerService;

  beforeEach(() => {
    triggers = {
      findDueCronTriggers: jest.fn().mockResolvedValue([cronTrigger]),
      claimCronSlot: jest.fn().mockResolvedValue(true),
    };
    definitions = {
      findById: jest.fn().mockResolvedValue({ id: 'def-1', key: 'welcome' }),
    };
    events = {
      create: jest.fn().mockResolvedValue({ id: 'ev-1' }),
    };
    cron = {
      next: jest.fn().mockReturnValue(new Date('2026-07-05T09:00:00.000Z')),
      isValid: jest.fn().mockReturnValue(true),
    };
    start = { execute: jest.fn().mockResolvedValue([{ id: 'run-1' }]) };
    resume = { execute: jest.fn().mockResolvedValue(0) };

    scheduler = new WorkflowSchedulerService(
      triggers as never,
      definitions as never,
      events as never,
      cron,
      start as never,
      resume as never,
    );
  });

  it('dispara los triggers vencidos y reprograma su próximo disparo', async () => {
    const { fired } = await scheduler.tick();

    expect(fired).toBe(1);
    // Cada tick también intenta reanudar delay/retry vencidos.
    expect(resume.execute).toHaveBeenCalledTimes(1);
    // Reclama el slot atómicamente: (id, nextFireAt esperado, próximo disparo).
    expect(triggers.claimCronSlot).toHaveBeenCalledWith(
      'trig-1',
      new Date('2026-07-04T09:00:00.000Z'),
      new Date('2026-07-05T09:00:00.000Z'),
    );
    // Emite un evento sintético workflow.cron.<key> con el cronPayload.
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'workflow.cron.welcome',
        payload: { source: 'daily' },
      }),
    );
    // Arranca con el target del trigger (fan-out).
    expect(start.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerKind: 'cron',
        target: { type: 'users', filter: { isActive: true } },
      }),
    );
  });

  it('un trigger que falla no impide procesar el resto', async () => {
    const bad: WorkflowTrigger = { ...cronTrigger, id: 'trig-bad' };
    triggers.findDueCronTriggers.mockResolvedValue([bad, cronTrigger]);
    // El primero falla al reclamar el slot; el segundo debe seguir.
    triggers.claimCronSlot
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(true);

    const { fired } = await scheduler.tick();

    expect(fired).toBe(1);
    expect(start.execute).toHaveBeenCalledTimes(1);
  });

  it('slot ya reclamado por otra instancia: no dispara (evita doble disparo)', async () => {
    triggers.claimCronSlot.mockResolvedValue(false);

    const { fired } = await scheduler.tick();

    expect(fired).toBe(0);
    expect(start.execute).not.toHaveBeenCalled();
    expect(events.create).not.toHaveBeenCalled();
  });

  it('reanuda los delay/retry vencidos y reporta el conteo', async () => {
    triggers.findDueCronTriggers.mockResolvedValue([]);
    resume.execute.mockResolvedValue(3);

    const { fired, resumed } = await scheduler.tick();

    expect(fired).toBe(0);
    expect(resumed).toBe(3);
  });
});
