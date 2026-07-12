import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  RESERVATION_STATUSES,
  type ReservationStatus,
} from '@core/shared-types';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListHostReservationsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: RESERVATION_STATUSES })
  @IsOptional()
  @IsIn(RESERVATION_STATUSES)
  status?: ReservationStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID() parkingId?: string;
}
