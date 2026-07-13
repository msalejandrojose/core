import type {
  HostPayoutStatus,
  Payment,
  PaymentStatus,
} from '../../domain/entities/payment.entity';

interface DecimalLike {
  toNumber(): number;
}

export interface PaymentRow {
  id: string;
  reservationId: string;
  status: string;
  amount: DecimalLike;
  platformFeeAmount: DecimalLike;
  hostPayoutAmount: DecimalLike;
  hostPayoutStatus: string;
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

export function toPaymentDomain(row: PaymentRow): Payment {
  return {
    id: row.id,
    reservationId: row.reservationId,
    status: row.status as PaymentStatus,
    amount: row.amount.toNumber(),
    platformFeeAmount: row.platformFeeAmount.toNumber(),
    hostPayoutAmount: row.hostPayoutAmount.toNumber(),
    hostPayoutStatus: row.hostPayoutStatus as HostPayoutStatus,
    hostPayoutReleasedAt: row.hostPayoutReleasedAt,
    provider: row.provider,
    providerCheckoutSessionId: row.providerCheckoutSessionId,
    providerPaymentIntentId: row.providerPaymentIntentId,
    paidAt: row.paidAt,
    failedAt: row.failedAt,
    refundedAt: row.refundedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
