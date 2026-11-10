import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Food, FoodSource } from '../../../domain/entities/food.entity';

export class FoodServingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: '1 rebanada' }) label: string;
  @ApiProperty({ example: 30 }) grams: number;
  @ApiProperty() isDefault: boolean;
}

export class FoodResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Arroz blanco cocido' }) name: string;
  @ApiPropertyOptional({ example: 'Hacendado' }) brand: string | null;
  @ApiPropertyOptional({ example: '8480000123456' }) barcode: string | null;
  @ApiProperty({ enum: ['CURATED', 'OPEN_FOOD_FACTS', 'USER'] })
  source: FoodSource;
  @ApiProperty({ description: 'Revisado por nosotros.' }) isVerified: boolean;
  @ApiProperty({ description: 'true si se mide en ml en vez de g.' })
  isLiquid: boolean;
  @ApiProperty({ example: 130, description: 'kcal por 100 g/ml.' })
  kcalPer100: number;
  @ApiProperty({ example: 2.7 }) proteinPer100G: number;
  @ApiProperty({ example: 28 }) carbsPer100G: number;
  @ApiProperty({ example: 0.3 }) fatPer100G: number;
  @ApiProperty({ type: [FoodServingResponseDto] })
  servings: FoodServingResponseDto[];

  static from(f: Food): FoodResponseDto {
    const dto = new FoodResponseDto();
    dto.id = f.id;
    dto.name = f.name;
    dto.brand = f.brand;
    dto.barcode = f.barcode;
    dto.source = f.source;
    dto.isVerified = f.isVerified;
    dto.isLiquid = f.isLiquid;
    dto.kcalPer100 = f.kcalPer100;
    dto.proteinPer100G = f.proteinPer100G;
    dto.carbsPer100G = f.carbsPer100G;
    dto.fatPer100G = f.fatPer100G;
    dto.servings = f.servings.map((s) => {
      const serving = new FoodServingResponseDto();
      serving.id = s.id;
      serving.label = s.label;
      serving.grams = s.grams;
      serving.isDefault = s.isDefault;
      return serving;
    });
    return dto;
  }
}
