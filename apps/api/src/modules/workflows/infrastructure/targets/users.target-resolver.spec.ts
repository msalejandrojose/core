import { UsersTargetResolver } from './users.target-resolver';
import { User } from '../../../iam/domain/entities/user.entity';
import type { UserRepositoryPort } from '../../../iam/application/ports/user-repository.port';
import { Filter } from '../../../../shared/query';

function makeUser(id: string, email: string): User {
  return new User(
    id,
    email,
    null,
    'Ada',
    'Lovelace',
    'BACKOFFICE',
    true,
    null,
    new Date(),
    new Date(),
  );
}

describe('UsersTargetResolver', () => {
  let getRows: jest.Mock;
  let resolver: UsersTargetResolver;

  beforeEach(() => {
    getRows = jest.fn().mockResolvedValue({
      items: [makeUser('u1', 'a@x.com'), makeUser('u2', 'b@x.com')],
      total: 2,
    });
    resolver = new UsersTargetResolver({
      getRows,
    } as unknown as UserRepositoryPort);
  });

  // Filtro con el que se llamó a getRows en la primera invocación.
  const usedFilter = () =>
    (getRows.mock.calls[0] as [{ filter: Filter<User> }])[0].filter;

  it('mapea usuarios a TargetRef con snapshot en data', async () => {
    const refs = await resolver.resolve({ type: 'users' });
    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({
      id: 'u1',
      entityType: 'user',
      data: {
        id: 'u1',
        email: 'a@x.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: 'BACKOFFICE',
        isActive: true,
      },
    });
  });

  it('por defecto filtra sólo usuarios activos', async () => {
    await resolver.resolve({ type: 'users' });
    expect(usedFilter().predicates).toContainEqual(
      expect.objectContaining({ op: 'eq', field: 'isActive', value: true }),
    );
  });

  it('respeta isActive=false del filtro', async () => {
    await resolver.resolve({ type: 'users', filter: { isActive: false } });
    expect(usedFilter().predicates).toContainEqual(
      expect.objectContaining({ op: 'eq', field: 'isActive', value: false }),
    );
  });

  it('añade filtro por userType cuando se pasa', async () => {
    await resolver.resolve({ type: 'users', filter: { userType: 'APP' } });
    expect(usedFilter().predicates).toContainEqual(
      expect.objectContaining({ op: 'eq', field: 'userType', value: 'APP' }),
    );
  });
});
