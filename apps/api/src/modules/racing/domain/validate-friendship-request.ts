import { Friendship } from './entities/friendship.entity';

export type FriendshipRequestValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

const OK: FriendshipRequestValidationResult = { ok: true };

function reject(reason: string): FriendshipRequestValidationResult {
  return { ok: false, reason };
}

// Valida una solicitud de amistad ANTES de crearla. `existingActive` es la
// solicitud PENDING o ACCEPTED que ya exista entre los dos jugadores, en
// cualquier dirección (la búsqueda la hace el repositorio) — null si no hay
// ninguna y se puede pedir.
export function validateFriendshipRequest(
  requesterId: string,
  addresseeId: string,
  existingActive: Friendship | null,
): FriendshipRequestValidationResult {
  if (requesterId === addresseeId) {
    return reject('no puedes añadirte a ti mismo');
  }

  if (existingActive !== null) {
    return reject(
      existingActive.status === 'ACCEPTED'
        ? 'ya sois amigos'
        : 'ya hay una solicitud pendiente entre vosotros',
    );
  }

  return OK;
}
