import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CarPartCategory } from '../../../domain/entities/car-part.entity';

// Sin `code`: no es editable una vez creado.
export class UpdateCarPartDto {
  @ApiPropertyOptional({ enum: CarPartCategory })
  @IsOptional()
  @IsEnum(CarPartCategory)
  category?: CarPartCategory;

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
  @IsBoolean()
  isUnlockedByDefault?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Precio en la tienda. null = quitarla de la venta.',
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
