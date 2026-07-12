import { FollowUserUseCase } from './follow-user.use-case';
import { CannotFollowSelfError } from '../../domain/errors/cannot-follow-self.error';
import { FollowTargetNotFoundError } from '../../domain/errors/follow-target-not-found.error';

describe('FollowUserUseCase', () => {
  let follows: { exists: jest.Mock; create: jest.Mock };
  let users: { findById: jest.Mock };
  let notifier: { notify: jest.Mock };
  let useCase: FollowUserUseCase;

  beforeEach(() => {
    follows = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(undefined),
    };
    users = {
      findById: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({ id, firstName: 'Ana', email: 'ana@example.com' }),
      ),
    };
    notifier = { notify: jest.fn().mockResolvedValue(undefined) };
    useCase = new FollowUserUseCase(
      follows as never,
      users as never,
      notifier as never,
    );
  });

  it('rechaza seguirse a uno mismo', async () => {
    await expect(
      useCase.execute({ followerId: 'user-1', followingId: 'user-1' }),
    ).rejects.toThrow(CannotFollowSelfError);
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario objetivo no existe', async () => {
    users.findById.mockResolvedValueOnce(null);
    await expect(
      useCase.execute({ followerId: 'user-1', followingId: 'user-2' }),
    ).rejects.toThrow(FollowTargetNotFoundError);
    expect(follows.create).not.toHaveBeenCalled();
  });

  it('crea el follow', async () => {
    await useCase.execute({ followerId: 'user-1', followingId: 'user-2' });
    expect(follows.create).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('es idempotente: si ya se seguía, no vuelve a crear ni a notificar', async () => {
    follows.exists.mockResolvedValue(true);
    await useCase.execute({ followerId: 'user-1', followingId: 'user-2' });
    expect(follows.create).not.toHaveBeenCalled();
    expect(notifier.notify).not.toHaveBeenCalled();
  });

  it('notifica al usuario seguido con el nombre de quien le sigue', async () => {
    await useCase.execute({ followerId: 'user-1', followingId: 'user-2' });

    expect(notifier.notify).toHaveBeenCalledWith({
      userId: 'user-2',
      kind: 'andanzas.follow',
      title: 'Ana te sigue ahora',
      data: { followerId: 'user-1' },
    });
  });

  it('no revienta el follow si falla el envío de la notificación', async () => {
    notifier.notify.mockRejectedValue(new Error('boom'));

    await expect(
      useCase.execute({ followerId: 'user-1', followingId: 'user-2' }),
    ).resolves.toBeUndefined();
    expect(follows.create).toHaveBeenCalled();
  });
});
