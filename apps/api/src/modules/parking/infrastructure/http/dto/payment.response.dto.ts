import { ApiProperty } from '@nestjs/swagger';
import {
  HOST_PAYOUT_STATUSES,
  PAYMENT_STATUSES,
  type HostPayoutStatus,
  type PaymentStatus,
} from '@core/shared-types';
import { type Payment } from '../../../domain/entities/payment.entity';

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() reservationId: string;
  @ApiProperty({ enum: PAYMENT_STATUSES }) status: PaymentStatus;
  @ApiProperty() amount: number;
  @ApiProperty() platformFeeAmount: number;
  @ApiProperty() hostPayoutAmount: number;
  @ApiProperty({ enum: HOST_PAYOUT_STATUSES })
  hostPayoutStatus: HostPayoutStatus;
  @ApiProperty({ type: Date, nullable: true })
  hostPayoutReleasedAt: Date | null;
  @ApiProperty() provider: string;
  @ApiProperty({ type: Date, nullable: true }) paidAt: Date | null;
  @ApiProperty({ type: Date, nullable: true }) failedAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(payment: Payment): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.reservationId = payment.reservationId;
    dto.status = payment.status;
    dto.amount = payment.amount;
    dto.platformFeeAmount = payment.platformFeeAmount;
    dto.hostPayoutAmount = payment.hostPayoutAmount;
    dto.hostPayoutStatus = payment.hostPayoutStatus;
    dto.hostPayoutReleasedAt = payment.hostPayoutReleasedAt;
    dto.provider = payment.provider;
    dto.paidAt = payment.paidAt;
    dto.failedAt = payment.failedAt;
    dto.createdAt = payment.createdAt;
    return dto;
  }
}
