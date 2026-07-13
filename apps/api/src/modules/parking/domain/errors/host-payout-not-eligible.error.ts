import { DomainError } from '../../../../shared/errors/domain-error';

/** Solo se puede liquidar al host un pago en estado `PAID` y `hostPayoutStatus: PENDING`. */
export class HostPayoutNotEligibleError extends DomainError {
  constructor(paymentId: string) {
    super(
      'HOST_PAYOUT_NOT_ELIGIBLE',
      'El pago no está en un estado que permita liquidar al host.',
      { paymentId },
    );
  }
}
