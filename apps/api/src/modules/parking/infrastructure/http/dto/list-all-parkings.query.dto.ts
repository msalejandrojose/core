import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PARKING_STATUSES, type ParkingStatus } from '@core/shared-types';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListAllParkingsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: PARKING_STATUSES })
  @IsOptional()
  @IsIn(PARKING_STATUSES)
  status?: ParkingStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID() hostUserId?: string;
}
