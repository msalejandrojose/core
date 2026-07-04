import { NestTargetResolverRegistry } from './nest-target-resolver.registry';
import { TargetResolver } from '../../application/ports/target-resolver.port';
import { TargetResolverNotFoundError } from '../../domain/errors/target-resolver-not-found.error';

const usersResolver: TargetResolver = {
  type: 'users',
  resolve: () =>
    Promise.resolve([{ id: 'u1', entityType: 'user', data: { id: 'u1' } }]),
};

describe('NestTargetResolverRegistry', () => {
  it('resuelve delegando en el resolver de su type', async () => {
    const registry = new NestTargetResolverRegistry([usersResolver]);
    const refs = await registry.resolve({ type: 'users' });
    expect(refs).toHaveLength(1);
    expect(refs[0].id).toBe('u1');
  });

  it('lanza TargetResolverNotFoundError si el type no está registrado', () => {
    const registry = new NestTargetResolverRegistry([usersResolver]);
    expect(() => registry.resolve({ type: 'orders' })).toThrow(
      TargetResolverNotFoundError,
    );
  });

  it('detecta colisiones de type al construir', () => {
    expect(
      () => new NestTargetResolverRegistry([usersResolver, usersResolver]),
    ).toThrow(/Duplicate target resolver type: users/);
  });

  it('has() y types() reflejan lo registrado', () => {
    const registry = new NestTargetResolverRegistry([usersResolver]);
    expect(registry.has('users')).toBe(true);
    expect(registry.has('orders')).toBe(false);
    expect(registry.types()).toEqual(['users']);
  });
});
