import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListAllReviewsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() parkingId?: string;
}
