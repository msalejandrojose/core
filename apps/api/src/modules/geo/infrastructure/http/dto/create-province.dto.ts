import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateProvinceDto {
  @ApiProperty({
    description: 'Código INE de provincia.',
    example: '28',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty({ maxLength: 120, example: 'Madrid' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ format: 'uuid', description: 'País al que pertenece.' })
  @IsUUID()
  countryId: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Comunidad autónoma (opcional).',
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  regionId?: string | null;
}
