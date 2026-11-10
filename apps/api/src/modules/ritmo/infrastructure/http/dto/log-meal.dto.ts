import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { MealType } from '../../../domain/entities/meal-entry.entity';
import { DAY_EXAMPLE, DAY_PATTERN } from './day.param';

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

/**
 * Dos formas de registrar, y el use case elige por la presencia de `foodId`:
 *  - `foodId` (+ `servingId` opcional): se escalan los valores del catálogo.
 *  - `customName` + `kcal`: registro rápido, sin catálogo.
 *
 * No se exige uno de los dos a nivel de DTO porque la combinación válida es
 * una regla de dominio, no de transporte: con `foodId` ausente y sin kcal, la
 * entrada vale 0 kcal, que es un registro legítimo ("un café solo").
 */
export class LogMealDto {
  @ApiProperty({ enum: MEAL_TYPES })
  @IsIn(MEAL_TYPES)
  mealType!: MealType;

  @ApiPropertyOptional({
    example: DAY_EXAMPLE,
    description: 'Día del diario. Por defecto, hoy en la zona del perfil.',
  })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'loggedOn debe tener formato YYYY-MM-DD.' })
  loggedOn?: string;

  @ApiPropertyOptional({ description: 'Alimento del catálogo.' })
  @IsOptional()
  @IsUUID()
  foodId?: string;

  @ApiPropertyOptional({
    description: 'Ración del alimento; entonces `quantity` son unidades de ración.',
  })
  @IsOptional()
  @IsUUID()
  servingId?: string;

  @ApiProperty({
    example: 150,
    description:
      'Gramos/ml consumidos, o unidades de la ración si se envía `servingId`.',
  })
  @IsNumber()
  @Min(0.1)
  @Max(10000)
  quantity!: number;

  @ApiPropertyOptional({
    example: 'Menú del día',
    description: 'Registro rápido sin catálogo.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customName?: string;

  @ApiPropertyOptional({ example: 700, description: 'Solo en registro rápido.' })
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
