import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateFoodServingDto {
  @ApiProperty({ example: '1 rebanada' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @ApiProperty({ example: 30, minimum: 0.1, maximum: 5000 })
  @IsNumber()
  @Min(0.1)
  @Max(5000)
  grams!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateFoodDto {
  @ApiProperty({ example: 'Tortilla de mi madre' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ example: '8480000123456' })
  @IsOptional()
  @Matches(/^\d{6,32}$/, { message: 'barcode debe ser numérico (EAN/UPC).' })
  barcode?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'true si se mide en ml (bebidas).',
  })
  @IsOptional()
  @IsBoolean()
  isLiquid?: boolean;

  @ApiProperty({ example: 180, description: 'kcal por 100 g/ml.' })
  @IsNumber()
  @Min(0)
  @Max(900)
  kcalPer100!: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  @Max(100)
  proteinPer100G!: number;

  @ApiProperty({ example: 9 })
  @IsNumber()
  @Min(0)
  @Max(100)
  carbsPer100G!: number;

  @ApiProperty({ example: 11 })
  @IsNumber()
  @Min(0)
  @Max(100)
  fatPer100G!: number;

  @ApiPropertyOptional({ type: [CreateFoodServingDto], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateFoodServingDto)
  servings?: CreateFoodServingDto[];
}
