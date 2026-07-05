import type { LeadStatus } from '@core/shared-types';
import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidLeadStatusTransitionError extends DomainError {
  constructor(from: LeadStatus, to: LeadStatus) {
    super(
      'INVALID_LEAD_TRANSITION',
      `La transición de estado del lead de ${from} a ${to} no está permitida.`,
      { from, to },
    );
  }
}
