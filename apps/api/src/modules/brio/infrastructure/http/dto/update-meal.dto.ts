import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { MealType } from '../../../domain/entities/meal-entry.entity';

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

/**
 * Corrección de una entrada. Con alimento del catálogo solo cuentan
 * `mealType` y `quantityG` (kcal y macros se escalan); en un registro rápido
 * también `name`, `kcal` y macros.
 */
export class UpdateMealDto {
  @ApiPropertyOptional({ enum: MEAL_TYPES })
  @IsOptional()
  @IsIn(MEAL_TYPES)
  mealType?: MealType;

  @ApiPropertyOptional({ example: 150, description: 'Gramos o ml.' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10000)
  quantityG?: number;

  @ApiPropertyOptional({ example: 'Menú del día' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 700 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  kcal?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  proteinG?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  carbsG?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  fatG?: number;
}
