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
    updateNextFireAt: jest.Mock;
  };
  let definitions: { findById: jest.Mock };
  let events: { create: jest.Mock };
  let cron: { next: jest.Mock; isValid: jest.Mock };
  let start: { execute: jest.Mock };
  let scheduler: WorkflowSchedulerService;

  beforeEach(() => {
    triggers = {
      findDueCronTriggers: jest.fn().mockResolvedValue([cronTrigger]),
      updateNextFireAt: jest.fn().mockResolvedValue(undefined),
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

    scheduler = new WorkflowSchedulerService(
      triggers as never,
      definitions as never,
      events as never,
      cron as never,
      start as never,
    );
  });

  it('dispara los triggers vencidos y reprograma su próximo disparo', async () => {
    const fired = await scheduler.tick();

    expect(fired).toBe(1);
    // Reprograma con el siguiente instante calculado.
    expect(triggers.updateNextFireAt).toHaveBeenCalledWith(
      'trig-1',
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
    // El primero falla al reprogramar; el segundo debe seguir.
    triggers.updateNextFireAt
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(undefined);

    const fired = await scheduler.tick();

    expect(fired).toBe(1);
    expect(start.execute).toHaveBeenCalledTimes(1);
  });
});
