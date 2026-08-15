import { DomainError } from '../../../../shared/errors/domain-error';

export class FriendshipNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'RACING_FRIENDSHIP_NOT_FOUND',
      `Solicitud de amistad ${id} no encontrada.`,
      {
        id,
      },
    );
  }
}
