import { FriendCode } from '../../domain/entities/friend-code.entity';
import { Friendship } from '../../domain/entities/friendship.entity';
import { FriendCodeRepositoryPort } from '../ports/friend-code-repository.port';
import { FriendshipRepositoryPort } from '../ports/friendship-repository.port';
import { RequestFriendshipUseCase } from './request-friendship.use-case';

const REQUESTER_ID = 'requester-1';
const ADDRESSEE_ID = 'addressee-1';
const CODE = 'ABCD2345';

class FakeFriendCodeRepository implements Partial<FriendCodeRepositoryPort> {
  constructor(private readonly byCode: FriendCode | null) {}
  findByCode(): Promise<FriendCode | null> {
    return Promise.resolve(this.byCode);
  }
}

class FakeFriendshipRepository implements Partial<FriendshipRepositoryPort> {
  lastCreate: { requesterId: string; addresseeId: string } | null = null;
  constructor(private readonly active: Friendship | null) {}

  findActiveBetween(): Promise<Friendship | null> {
    return Promise.resolve(this.active);
  }

  create(requesterId: string, addresseeId: string): Promise<Friendship> {
    this.lastCreate = { requesterId, addresseeId };
    return Promise.resolve(
      new Friendship(
        'f-1',
        requesterId,
        addresseeId,
        'PENDING',
        new Date(),
        null,
      ),
    );
  }
}

function useCase(byCode: FriendCode | null, active: Friendship | null = null) {
  const friendships = new FakeFriendshipRepository(active);
  return {
    uc: new RequestFriendshipUseCase(
      new FakeFriendCodeRepository(
        byCode,
      ) as unknown as FriendCodeRepositoryPort,
      friendships as unknown as FriendshipRepositoryPort,
    ),
    friendships,
  };
}

describe('RequestFriendshipUseCase', () => {
  it('rechaza un código que no existe', async () => {
    const { uc } = useCase(null);
    await expect(uc.execute(REQUESTER_ID, CODE)).rejects.toMatchObject({
      code: 'RACING_FRIEND_CODE_NOT_FOUND',
    });
  });

  it('rechaza añadirse a uno mismo (código propio)', async () => {
    const ownCode = new FriendCode(REQUESTER_ID, CODE, new Date());
    const { uc } = useCase(ownCode);
    await expect(uc.execute(REQUESTER_ID, CODE)).rejects.toMatchObject({
      code: 'RACING_INVALID_FRIENDSHIP_REQUEST',
    });
  });

  it('rechaza si ya sois amigos o hay una solicitud pendiente', async () => {
    const code = new FriendCode(ADDRESSEE_ID, CODE, new Date());
    const active = new Friendship(
      'f-0',
      REQUESTER_ID,
      ADDRESSEE_ID,
      'PENDING',
      new Date(),
      null,
    );
    const { uc } = useCase(code, active);
    await expect(uc.execute(REQUESTER_ID, CODE)).rejects.toMatchObject({
      code: 'RACING_INVALID_FRIENDSHIP_REQUEST',
    });
  });

  it('crea la solicitud cuando todo es válido', async () => {
    const code = new FriendCode(ADDRESSEE_ID, CODE, new Date());
    const { uc, friendships } = useCase(code, null);
    const result = await uc.execute(REQUESTER_ID, CODE);

    expect(result.status).toBe('PENDING');
    expect(friendships.lastCreate).toEqual({
      requesterId: REQUESTER_ID,
      addresseeId: ADDRESSEE_ID,
    });
  });
});
