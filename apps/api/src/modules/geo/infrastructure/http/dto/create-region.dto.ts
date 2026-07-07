import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({
    description: 'Código INE de CCAA.',
    example: '13',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty({ maxLength: 120, example: 'Comunidad de Madrid' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ format: 'uuid', description: 'País al que pertenece.' })
  @IsUUID()
  countryId: string;
}
