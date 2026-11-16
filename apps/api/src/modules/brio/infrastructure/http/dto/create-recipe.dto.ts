import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RecipeIngredientDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  foodId!: string;

  @ApiProperty({ example: 320, minimum: 1, maximum: 5000 })
  @IsNumber()
  @Min(1)
  @Max(5000)
  grams!: number;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Lentejas de la abuela' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 24 })
  @IsInt()
  @Min(1)
  @Max(24)
  servings!: number;

  @ApiProperty({ type: [RecipeIngredientDto], minItems: 1, maxItems: 30 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}
