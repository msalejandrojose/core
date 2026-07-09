import { SendPushToUserUseCase } from './send-push-to-user.use-case';
import type { DeviceRepositoryPort } from '../ports/device-repository.port';
import type { SendNotificationUseCase } from '../../../notifications/application/use-cases/send-notification.use-case';

function makeRepo(tokens: string[]): DeviceRepositoryPort {
  return {
    upsert: jest.fn(),
    deleteByToken: jest.fn(),
    listTokensByUser: jest.fn().mockResolvedValue(tokens),
  };
}

// Solo nos interesa `executeByKey`; el resto del use case no se toca aquí.
function makeSender(
  executeByKey: jest.Mock,
): Pick<SendNotificationUseCase, 'executeByKey'> {
  return { executeByKey } as unknown as Pick<
    SendNotificationUseCase,
    'executeByKey'
  >;
}

describe('SendPushToUserUseCase', () => {
  it('resuelve todos los tokens del usuario y envía a cada uno', async () => {
    const repo = makeRepo(['tok-a', 'tok-b']);
    const executeByKey = jest
      .fn()
      .mockResolvedValue({ sent: true, skipped: false });
    const useCase = new SendPushToUserUseCase(
      repo,
      makeSender(executeByKey) as SendNotificationUseCase,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      messageTypeKey: 'push.order_ready',
      variables: { orderId: '42' },
    });

    expect(repo.listTokensByUser).toHaveBeenCalledWith('user-1');
    expect(executeByKey).toHaveBeenCalledTimes(2);
    expect(executeByKey).toHaveBeenCalledWith('push.order_ready', {
      to: 'tok-a',
      variables: { orderId: '42' },
      dryRun: undefined,
    });
    expect(result).toEqual({ devices: 2, sent: 2, skipped: 0 });
  });

  it('cuenta los envíos omitidos por inactividad', async () => {
    const repo = makeRepo(['tok-a', 'tok-b']);
    const executeByKey = jest
      .fn()
      .mockResolvedValueOnce({ sent: true, skipped: false })
      .mockResolvedValueOnce({ sent: false, skipped: true });
    const useCase = new SendPushToUserUseCase(
      repo,
      makeSender(executeByKey) as SendNotificationUseCase,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      messageTypeKey: 'push.x',
    });

    expect(result).toEqual({ devices: 2, sent: 1, skipped: 1 });
  });

  it('un token que falla no aborta el resto', async () => {
    const repo = makeRepo(['tok-bad', 'tok-ok']);
    const executeByKey = jest
      .fn()
      .mockRejectedValueOnce(new Error('NotRegistered'))
      .mockResolvedValueOnce({ sent: true, skipped: false });
    const useCase = new SendPushToUserUseCase(
      repo,
      makeSender(executeByKey) as SendNotificationUseCase,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      messageTypeKey: 'push.x',
    });

    expect(executeByKey).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ devices: 2, sent: 1, skipped: 0 });
  });

  it('usuario sin dispositivos: no envía nada', async () => {
    const repo = makeRepo([]);
    const executeByKey = jest.fn();
    const useCase = new SendPushToUserUseCase(
      repo,
      makeSender(executeByKey) as SendNotificationUseCase,
    );

    const result = await useCase.execute({
      userId: 'user-1',
      messageTypeKey: 'push.x',
    });

    expect(executeByKey).not.toHaveBeenCalled();
    expect(result).toEqual({ devices: 0, sent: 0, skipped: 0 });
  });
});
