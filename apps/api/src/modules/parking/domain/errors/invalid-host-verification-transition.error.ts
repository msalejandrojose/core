import type { HostVerificationStatus } from '@core/shared-types';
import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidHostVerificationTransitionError extends DomainError {
  constructor(from: HostVerificationStatus, to: HostVerificationStatus) {
    super(
      'INVALID_HOST_VERIFICATION_TRANSITION',
      `La transición de estado de la verificación de host de ${from} a ${to} no está permitida.`,
      { from, to },
    );
  }
}
