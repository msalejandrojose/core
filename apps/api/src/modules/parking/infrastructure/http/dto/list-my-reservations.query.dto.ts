import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  RESERVATION_STATUSES,
  type ReservationStatus,
} from '@core/shared-types';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListMyReservationsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: RESERVATION_STATUSES })
  @IsOptional()
  @IsIn(RESERVATION_STATUSES)
  status?: ReservationStatus;
}
