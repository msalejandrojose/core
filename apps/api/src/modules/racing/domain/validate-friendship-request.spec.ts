import { Friendship } from './entities/friendship.entity';
import { validateFriendshipRequest } from './validate-friendship-request';

function friendship(status: 'PENDING' | 'ACCEPTED' | 'REJECTED'): Friendship {
  return new Friendship('f-1', 'a', 'b', status, new Date(), null);
}

describe('validateFriendshipRequest', () => {
  it('acepta una solicitud sin nada previo entre los dos', () => {
    expect(validateFriendshipRequest('a', 'b', null).ok).toBe(true);
  });

  it('rechaza añadirse a uno mismo', () => {
    const result = validateFriendshipRequest('a', 'a', null);
    expect(result.ok).toBe(false);
  });

  it('rechaza si ya hay una solicitud PENDING entre ambos', () => {
    const result = validateFriendshipRequest('a', 'b', friendship('PENDING'));
    expect(result.ok).toBe(false);
  });

  it('rechaza si ya sois amigos (ACCEPTED)', () => {
    const result = validateFriendshipRequest('a', 'b', friendship('ACCEPTED'));
    expect(result.ok).toBe(false);
  });

  it('acepta si la única fila previa fue REJECTED', () => {
    // El repositorio solo pasa como `existingActive` las PENDING/ACCEPTED —
    // una REJECTED no cuenta como activa, así que aquí llega null.
    expect(validateFriendshipRequest('a', 'b', null).ok).toBe(true);
  });
});
