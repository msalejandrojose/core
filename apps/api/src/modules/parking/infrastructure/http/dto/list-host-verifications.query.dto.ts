import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  HOST_VERIFICATION_STATUSES,
  type HostVerificationStatus,
} from '@core/shared-types';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListHostVerificationsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: HOST_VERIFICATION_STATUSES })
  @IsOptional()
  @IsIn(HOST_VERIFICATION_STATUSES)
  status?: HostVerificationStatus;
}
