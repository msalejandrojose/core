import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  HOST_PAYOUT_STATUSES,
  PAYMENT_STATUSES,
  type HostPayoutStatus,
  type PaymentStatus,
} from '@core/shared-types';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListAllPaymentsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: PAYMENT_STATUSES })
  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: HOST_PAYOUT_STATUSES })
  @IsOptional()
  @IsIn(HOST_PAYOUT_STATUSES)
  hostPayoutStatus?: HostPayoutStatus;
}
