import { FollowUserUseCase } from './follow-user.use-case';
import { CannotFollowSelfError } from '../../domain/errors/cannot-follow-self.error';
import { FollowTargetNotFoundError } from '../../domain/errors/follow-target-not-found.error';

describe('FollowUserUseCase', () => {
  let follows: { exists: jest.Mock; create: jest.Mock };
  let users: { findById: jest.Mock };
  let useCase: FollowUserUseCase;

  beforeEach(() => {
    follows = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(undefined),
    };
    users = { findById: jest.fn().mockResolvedValue({ id: 'user-2' }) };
    useCase = new FollowUserUseCase(follows as never, users as never);
  });

  it('rechaza seguirse a uno mismo', async () => {
    await expect(
      useCase.execute({ followerId: 'user-1', followingId: 'user-1' }),
    ).rejects.toThrow(CannotFollowSelfError);
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario objetivo no existe', async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ followerId: 'user-1', followingId: 'user-2' }),
    ).rejects.toThrow(FollowTargetNotFoundError);
    expect(follows.create).not.toHaveBeenCalled();
  });

  it('crea el follow', async () => {
    await useCase.execute({ followerId: 'user-1', followingId: 'user-2' });
    expect(follows.create).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('es idempotente: si ya se seguía, no vuelve a crear', async () => {
    follows.exists.mockResolvedValue(true);
    await useCase.execute({ followerId: 'user-1', followingId: 'user-2' });
    expect(follows.create).not.toHaveBeenCalled();
  });
});
