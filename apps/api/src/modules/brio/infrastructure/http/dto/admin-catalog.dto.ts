import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  AdminActivityType,
  AdminExercise,
  AdminFood,
} from '../../../application/ports/catalog-admin.port';

const MEASURES = ['REPS', 'DISTANCE', 'TIME', 'CALORIES'] as const;
const KINDS = [
  'STRENGTH',
  'RUN',
  'CYCLE',
  'WALK',
  'HIKE',
  'SWIM',
  'ELLIPTICAL',
  'OTHER_CARDIO',
  'OTHER',
] as const;
const SOURCES = ['CURATED', 'OPEN_FOOD_FACTS', 'USER'] as const;

export class AdminServingDto {
  @ApiProperty({ example: '1 rebanada' })
  @IsString()
  @MaxLength(80)
  label!: string;
  @ApiProperty({ example: 30 }) @IsNumber() @Min(0.1) @Max(5000) grams!: number;
  @ApiProperty() @IsBoolean() isDefault!: boolean;
}

export class AdminFoodDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) brand!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) barcode!:
    | string
    | null;
  @ApiProperty({ enum: SOURCES }) source!: AdminFood['source'];
  @ApiProperty() isVerified!: boolean;
  @ApiProperty() isLiquid!: boolean;
  @ApiProperty() kcalPer100!: number;
  @ApiProperty() proteinPer100G!: number;
  @ApiProperty() carbsPer100G!: number;
  @ApiProperty() fatPer100G!: number;
  @ApiProperty({ type: [AdminServingDto] }) servings!: AdminServingDto[];
  @ApiProperty({ description: 'Veces que se ha apuntado.' }) uses!: number;

  static from(f: AdminFood): AdminFoodDto {
    return Object.assign(new AdminFoodDto(), f);
  }
}

export class AdminFoodPageDto {
  @ApiProperty({ type: [AdminFoodDto] }) data!: AdminFoodDto[];
  @ApiProperty() total!: number;
}

export class AdminFoodQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ enum: SOURCES })
  @IsOptional()
  @IsIn(SOURCES)
  source?: AdminFood['source'];
  @ApiPropertyOptional({ description: 'Solo los que faltan por revisar.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unverified?: boolean;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class SaveAdminFoodDto {
  @ApiProperty() @IsString() @MaxLength(200) name!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Matches(/^\d{6,14}$/, {
    message: 'barcode debe ser un EAN/UPC (solo dígitos).',
  })
  barcode?: string | null;
  @ApiProperty() @IsBoolean() isVerified!: boolean;
  @ApiProperty() @IsBoolean() isLiquid!: boolean;
  @ApiProperty() @IsInt() @Min(0) @Max(950) kcalPer100!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) proteinPer100G!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) carbsPer100G!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) fatPer100G!: number;
  @ApiProperty({ type: [AdminServingDto] })
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AdminServingDto)
  servings!: AdminServingDto[];
}

export class AdminMuscleDto {
  @ApiProperty({ example: 'CHEST' }) @IsString() muscle!: string;
  @ApiProperty({
    example: 1,
    description: '1 principal, 0.5 secundario, 0.25 indirecto.',
  })
  @IsNumber()
  weight!: number;
}

export class AdminExerciseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) code!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: MEASURES }) measure!: AdminExercise['measure'];
  @ApiProperty() isCompound!: boolean;
  @ApiProperty() isBodyweight!: boolean;
  @ApiProperty() isArchived!: boolean;
  @ApiProperty({ type: [AdminMuscleDto] }) muscles!: AdminMuscleDto[];
  @ApiProperty({ description: 'Series registradas con él.' }) uses!: number;

  static from(e: AdminExercise): AdminExerciseDto {
    return Object.assign(new AdminExerciseDto(), e);
  }
}

export class SaveAdminExerciseDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Matches(/^[a-z0-9_]{2,64}$/, { message: 'code: minúsculas, números y _.' })
  code?: string | null;
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty({ enum: MEASURES })
  @IsIn(MEASURES)
  measure!: AdminExercise['measure'];
  @ApiProperty() @IsBoolean() isCompound!: boolean;
  @ApiProperty() @IsBoolean() isBodyweight!: boolean;
  @ApiProperty() @IsBoolean() isArchived!: boolean;
  @ApiProperty({ type: [AdminMuscleDto] })
  @IsArray()
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => AdminMuscleDto)
  muscles!: AdminMuscleDto[];
}

export class AdminActivityTypeDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) code!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() met!: number;
  @ApiProperty({ enum: KINDS }) kind!: AdminActivityType['kind'];
  @ApiPropertyOptional({ type: String, nullable: true }) icon!: string | null;
  @ApiProperty() isArchived!: boolean;
  @ApiProperty({ description: 'Entrenos registrados con él.' }) uses!: number;

  static from(t: AdminActivityType): AdminActivityTypeDto {
    return Object.assign(new AdminActivityTypeDto(), t);
  }
}

export class SaveAdminActivityTypeDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Matches(/^[a-z0-9_]{2,64}$/, { message: 'code: minúsculas, números y _.' })
  code?: string | null;
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty({
    example: 8,
    description: 'MET del Compendium of Physical Activities.',
  })
  @IsNumber()
  @Min(1)
  @Max(25)
  met!: number;
  @ApiProperty({ enum: KINDS }) @IsIn(KINDS) kind!: AdminActivityType['kind'];
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string | null;
  @ApiProperty() @IsBoolean() isArchived!: boolean;
}
