import { DomainError } from '../../../../shared/errors/domain-error';

// Se lanza al intentar aceptar/rechazar una solicitud que no está PENDING
// (ya se respondió antes) o que no es tuya para responder (no eres el
// destinatario — el remitente no puede autoaceptarse).
export class FriendshipNotRespondableError extends DomainError {
  constructor(id: string, reason: string) {
    super(
      'RACING_FRIENDSHIP_NOT_RESPONDABLE',
      `No se puede responder a la solicitud ${id}: ${reason}.`,
      { id, reason },
    );
  }
}
