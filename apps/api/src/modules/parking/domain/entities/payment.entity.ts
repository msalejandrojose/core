import type { HostPayoutStatus, PaymentStatus } from '@core/shared-types';

export type { HostPayoutStatus, PaymentStatus };

// Cobro al huésped de una reserva + reparto de comisión. 1-1 con `Reservation`.
export interface Payment {
  id: string;
  reservationId: string;
  status: PaymentStatus;

  amount: number;
  platformFeeAmount: number;
  hostPayoutAmount: number;
  hostPayoutStatus: HostPayoutStatus;
  hostPayoutReleasedAt: Date | null;

  provider: string;
  providerCheckoutSessionId: string | null;
  providerPaymentIntentId: string | null;

  paidAt: Date | null;
  failedAt: Date | null;
  refundedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}
