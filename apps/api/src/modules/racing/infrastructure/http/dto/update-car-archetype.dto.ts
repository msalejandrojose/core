import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Sin `code`: no es editable una vez creado (ver CreateCarArchetypeDto).
export class UpdateCarArchetypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  speedScale?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  grip?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offroadGripModifier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnlockedByDefault?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Precio en la tienda. null = quitarlo de la venta.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  priceCoins?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
