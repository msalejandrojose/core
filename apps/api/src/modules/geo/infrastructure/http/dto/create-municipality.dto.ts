import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMunicipalityDto {
  @ApiProperty({
    description: 'Código INE de municipio (5 dígitos).',
    example: '28079',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty({ maxLength: 160, example: 'Madrid' })
  @IsString()
  @MaxLength(160)
  name: string;

  @ApiProperty({ format: 'uuid', description: 'Provincia a la que pertenece.' })
  @IsUUID()
  provinceId: string;
}
