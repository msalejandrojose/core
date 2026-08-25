import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSeasonDto {
  @ApiProperty({ example: 'Temporada 1' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({
    description:
      'Por defecto, ahora mismo. La temporada abierta, si hubiera alguna, se cierra en este mismo instante.',
  })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;
}
