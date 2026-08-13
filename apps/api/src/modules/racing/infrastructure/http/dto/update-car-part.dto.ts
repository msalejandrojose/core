import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
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
  isActive?: boolean;
}
