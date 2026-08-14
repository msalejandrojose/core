import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateGrandPrixDto {
  @ApiProperty({
    example: 'copa-verano',
    description: 'Único. No editable después.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug solo admite minúsculas, dígitos y guiones (kebab-case)',
  })
  slug!: string;

  @ApiProperty({ example: 'Copa de Verano' })
  @IsString()
  name!: string;

  @ApiProperty({
    type: [String],
    description: 'Ids de circuito, en el orden en que se disputan. Mínimo dos.',
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  trackIds!: string[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
