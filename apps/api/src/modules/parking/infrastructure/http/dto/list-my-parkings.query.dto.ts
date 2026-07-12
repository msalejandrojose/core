import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PARKING_STATUSES, type ParkingStatus } from '@core/shared-types';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListMyParkingsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: PARKING_STATUSES })
  @IsOptional()
  @IsIn(PARKING_STATUSES)
  status?: ParkingStatus;
}
