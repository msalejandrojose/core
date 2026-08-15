import { DomainError } from '../../../../shared/errors/domain-error';

export class FriendCodeNotFoundError extends DomainError {
  constructor(code: string) {
    super(
      'RACING_FRIEND_CODE_NOT_FOUND',
      `Ningún jugador tiene el código ${code}.`,
      { code },
    );
  }
}
