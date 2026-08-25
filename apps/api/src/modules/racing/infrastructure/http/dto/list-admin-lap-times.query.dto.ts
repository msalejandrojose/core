import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';

export class ListAdminLapTimesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por circuito.' })
  @IsOptional()
  @IsUUID()
  trackId?: string;

  @ApiPropertyOptional({ description: 'Filtra por jugador.' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
