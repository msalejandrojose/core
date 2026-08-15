import {
  Friendship,
  FriendshipStatus,
} from '../../domain/entities/friendship.entity';
import { FriendshipRepositoryPort } from '../ports/friendship-repository.port';
import { RespondFriendshipUseCase } from './respond-friendship.use-case';

const REQUESTER_ID = 'requester-1';
const ADDRESSEE_ID = 'addressee-1';

function friendship(status: FriendshipStatus): Friendship {
  return new Friendship(
    'f-1',
    REQUESTER_ID,
    ADDRESSEE_ID,
    status,
    new Date(),
    null,
  );
}

class FakeFriendshipRepository implements Partial<FriendshipRepositoryPort> {
  lastAction: 'accept' | 'reject' | null = null;
  constructor(private readonly existing: Friendship | null) {}

  findById(): Promise<Friendship | null> {
    return Promise.resolve(this.existing);
  }
  accept(id: string): Promise<Friendship> {
    this.lastAction = 'accept';
    return Promise.resolve(
      new Friendship(
        id,
        REQUESTER_ID,
        ADDRESSEE_ID,
        'ACCEPTED',
        new Date(),
        new Date(),
      ),
    );
  }
  reject(id: string): Promise<Friendship> {
    this.lastAction = 'reject';
    return Promise.resolve(
      new Friendship(
        id,
        REQUESTER_ID,
        ADDRESSEE_ID,
        'REJECTED',
        new Date(),
        new Date(),
      ),
    );
  }
}

function useCase(existing: Friendship | null) {
  const friendships = new FakeFriendshipRepository(existing);
  return {
    uc: new RespondFriendshipUseCase(
      friendships as unknown as FriendshipRepositoryPort,
    ),
    friendships,
  };
}

describe('RespondFriendshipUseCase', () => {
  it('rechaza una solicitud que no existe', async () => {
    const { uc } = useCase(null);
    await expect(uc.execute(ADDRESSEE_ID, 'f-1', true)).rejects.toMatchObject({
      code: 'RACING_FRIENDSHIP_NOT_FOUND',
    });
  });

  it('rechaza si quien responde no es el destinatario', async () => {
    const { uc } = useCase(friendship('PENDING'));
    await expect(uc.execute(REQUESTER_ID, 'f-1', true)).rejects.toMatchObject({
      code: 'RACING_FRIENDSHIP_NOT_RESPONDABLE',
    });
  });

  it('rechaza responder una solicitud ya resuelta', async () => {
    const { uc } = useCase(friendship('ACCEPTED'));
    await expect(uc.execute(ADDRESSEE_ID, 'f-1', true)).rejects.toMatchObject({
      code: 'RACING_FRIENDSHIP_NOT_RESPONDABLE',
    });
  });

  it('acepta cuando el destinatario responde que sí', async () => {
    const { uc, friendships } = useCase(friendship('PENDING'));
    const result = await uc.execute(ADDRESSEE_ID, 'f-1', true);
    expect(result.status).toBe('ACCEPTED');
    expect(friendships.lastAction).toBe('accept');
  });

  it('rechaza cuando el destinatario responde que no', async () => {
    const { uc, friendships } = useCase(friendship('PENDING'));
    const result = await uc.execute(ADDRESSEE_ID, 'f-1', false);
    expect(result.status).toBe('REJECTED');
    expect(friendships.lastAction).toBe('reject');
  });
});
