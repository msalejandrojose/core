import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';

export class ListUserNotificationsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Si es `true`, solo devuelve las no leídas.',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unread?: boolean;
}
