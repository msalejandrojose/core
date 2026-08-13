import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { CarPartCategory } from '../../../domain/entities/car-part.entity';

export class CreateCarPartDto {
  @ApiProperty({
    example: 'tires-grip',
    description: 'Único. No editable después.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'code solo admite minúsculas, dígitos y guiones (kebab-case)',
  })
  code!: string;

  @ApiProperty({ enum: CarPartCategory })
  @IsEnum(CarPartCategory)
  category!: CarPartCategory;

  @ApiProperty({ example: 'Neumáticos de agarre' })
  @IsString()
  name!: string;

  @ApiProperty({ example: -0.05, description: 'Delta sobre speedScale.' })
  @IsNumber()
  speedScale!: number;

  @ApiProperty({ example: 0.1, description: 'Delta sobre grip.' })
  @IsNumber()
  grip!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
