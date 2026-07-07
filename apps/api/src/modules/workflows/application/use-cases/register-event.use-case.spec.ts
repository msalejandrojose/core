import { RegisterEventUseCase } from './register-event.use-case';

describe('RegisterEventUseCase', () => {
  let events: {
    findByIdempotencyKey: jest.Mock;
    create: jest.Mock;
  };
  let triggers: { findActiveEventTriggers: jest.Mock };
  let definitions: { findById: jest.Mock };
  let start: { execute: jest.Mock };
  let resume: { resumeMatchingWaitEvents: jest.Mock };
  let useCase: RegisterEventUseCase;

  const event = { id: 'ev-1', type: 'order.paid', payload: { orderId: 'o-1' } };

  beforeEach(() => {
    events = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(event),
    };
    triggers = { findActiveEventTriggers: jest.fn().mockResolvedValue([]) };
    definitions = { findById: jest.fn() };
    start = { execute: jest.fn().mockResolvedValue([]) };
    resume = { resumeMatchingWaitEvents: jest.fn().mockResolvedValue(0) };
    useCase = new RegisterEventUseCase(
      events as never,
      triggers as never,
      definitions as never,
      start as never,
      resume as never,
    );
  });

  it('persiste el evento y reanuda los runs que lo esperaban', async () => {
    const result = await useCase.execute({
      type: 'order.paid',
      payload: { orderId: 'o-1' },
    });

    expect(events.create).toHaveBeenCalled();
    expect(resume.resumeMatchingWaitEvents).toHaveBeenCalledWith(event);
    expect(result).toBe(event);
  });

  it('dedupe por idempotencyKey: no crea ni reanuda', async () => {
    events.findByIdempotencyKey.mockResolvedValue(event);

    await useCase.execute({
      type: 'order.paid',
      payload: {},
      idempotencyKey: 'k1',
    });

    expect(events.create).not.toHaveBeenCalled();
    expect(resume.resumeMatchingWaitEvents).not.toHaveBeenCalled();
  });
});
