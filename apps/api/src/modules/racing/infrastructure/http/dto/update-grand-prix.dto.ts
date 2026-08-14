import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

// Sin `slug`: no es editable una vez creado (ver CreateGrandPrixDto).
export class UpdateGrandPrixDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Si viene, sustituye la lista de circuitos entera, en el nuevo orden. Mínimo dos.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  trackIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
