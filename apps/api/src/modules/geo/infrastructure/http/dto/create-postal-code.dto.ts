import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePostalCodeDto {
  @ApiProperty({
    description: 'Código postal (5 dígitos).',
    example: '28001',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty({ format: 'uuid', description: 'Municipio al que pertenece.' })
  @IsUUID()
  municipalityId: string;
}
