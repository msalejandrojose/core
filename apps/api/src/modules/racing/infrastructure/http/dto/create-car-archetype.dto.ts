import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateCarArchetypeDto {
  @ApiProperty({
    example: 'normal',
    description: 'Único. No editable después.',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'code solo admite minúsculas, dígitos y guiones (kebab-case)',
  })
  code!: string;

  @ApiProperty({ example: 'Normal' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  speedScale!: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  grip!: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  offroadGripModifier!: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
