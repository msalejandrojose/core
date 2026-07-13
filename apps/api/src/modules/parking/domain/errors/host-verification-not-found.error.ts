import { DomainError } from '../../../../shared/errors/domain-error';

export class HostVerificationNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'HOST_VERIFICATION_NOT_FOUND',
      `Verificación de host ${id} no encontrada.`,
      { id },
    );
  }
}
