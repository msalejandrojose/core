import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  MealEntry,
  MealType,
} from '../../../domain/entities/meal-entry.entity';

export class MealEntryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: '2026-11-10' }) loggedOn: string;
  @ApiProperty({ enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] })
  mealType: MealType;
  @ApiProperty({ example: 'Arroz blanco cocido (Hacendado)' }) name: string;
  @ApiPropertyOptional() foodId: string | null;
  @ApiPropertyOptional() servingId: string | null;
  @ApiProperty({ example: 150 }) quantityG: number;
  @ApiProperty({ example: 195 }) kcal: number;
  @ApiProperty({ example: 4.1 }) proteinG: number;
  @ApiProperty({ example: 42 }) carbsG: number;
  @ApiProperty({ example: 0.5 }) fatG: number;

  static from(e: MealEntry): MealEntryResponseDto {
    const dto = new MealEntryResponseDto();
    dto.id = e.id;
    dto.loggedOn = e.loggedOn;
    dto.mealType = e.mealType;
    dto.name = e.name;
    dto.foodId = e.foodId;
    dto.servingId = e.servingId;
    dto.quantityG = e.quantityG;
    dto.kcal = e.kcal;
    dto.proteinG = e.proteinG;
    dto.carbsG = e.carbsG;
    dto.fatG = e.fatG;
    return dto;
  }
}
