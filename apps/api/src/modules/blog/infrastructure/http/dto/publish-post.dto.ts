import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class PublishPostDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description:
      'Fecha de publicación. Si es futura, el post queda SCHEDULED; si es ' +
      'pasada o se omite, se publica inmediatamente.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishedAt?: Date;
}
