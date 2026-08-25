import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// Sin `code`: no es editable una vez creado.
export class UpdateCarSkinDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  modelPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnlockedByDefault?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Precio en la tienda (TASK-320). null = quitarlo de la venta.',
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
