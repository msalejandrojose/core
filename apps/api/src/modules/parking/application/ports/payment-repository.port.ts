import { CursorPage } from '../../../../shared/pagination';
import type {
  HostPayoutStatus,
  Payment,
  PaymentStatus,
} from '../../domain/entities/payment.entity';

export const PAYMENT_REPOSITORY = Symbol('PARKING_PAYMENT_REPOSITORY');

export interface CreatePaymentData {
  reservationId: string;
  amount: number;
  platformFeeAmount: number;
  hostPayoutAmount: number;
  provider: string;
  providerCheckoutSessionId: string;
}

export interface UpdatePaymentPatch {
  status?: PaymentStatus;
  providerPaymentIntentId?: string | null;
  hostPayoutStatus?: HostPayoutStatus;
  hostPayoutReleasedAt?: Date | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  refundedAt?: Date | null;
}

export interface ListAllPaymentsOptions {
  limit: number;
  cursor?: string;
  status?: PaymentStatus;
  hostPayoutStatus?: HostPayoutStatus;
}

export interface PaymentRepositoryPort {
  create(data: CreatePaymentData): Promise<Payment>;
  update(id: string, patch: UpdatePaymentPatch): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByReservationId(reservationId: string): Promise<Payment | null>;
  findByCheckoutSessionId(sessionId: string): Promise<Payment | null>;
  listAll(opts: ListAllPaymentsOptions): Promise<CursorPage<Payment>>;
}
