import { DomainError } from '../../../../shared/errors/domain-error';

// Envuelve el rechazo de `validateFriendshipRequest`, mismo patrón que
// `InvalidOnlineRaceParticipantsError` con `validateOnlineRaceParticipants`.
export class InvalidFriendshipRequestError extends DomainError {
  constructor(reason: string) {
    super(
      'RACING_INVALID_FRIENDSHIP_REQUEST',
      `Solicitud de amistad inválida: ${reason}.`,
    );
  }
}
