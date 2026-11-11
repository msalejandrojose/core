import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  ActivityLevel,
  GoalType,
  Sex,
} from '../../../domain/entities/ritmo-profile.entity';
import {
  MAX_WEEKLY_CHANGE_KG,
  MIN_WEEKLY_CHANGE_KG,
} from '../../../domain/services/energy';
import { DAY_EXAMPLE, DAY_PATTERN } from './day.param';

const SEXES: Sex[] = ['MALE', 'FEMALE', 'OTHER'];
const LEVELS: ActivityLevel[] = [
  'SEDENTARY',
  'LIGHT',
  'MODERATE',
  'ACTIVE',
  'VERY_ACTIVE',
];
const GOALS: GoalType[] = ['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE'];

export class SaveProfileDto {
  @ApiPropertyOptional({ enum: SEXES })
  @IsOptional()
  @IsIn(SEXES)
  sex?: Sex;

  @ApiPropertyOptional({ example: DAY_EXAMPLE, description: 'Fecha de nacimiento.' })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'birthDate debe tener formato YYYY-MM-DD.' })
  birthDate?: string;

  @ApiPropertyOptional({ example: 178, minimum: 80, maximum: 250 })
  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(250)
  heightCm?: number;

  @ApiProperty({ enum: LEVELS, description: 'Nivel de actividad habitual.' })
  @IsIn(LEVELS)
  activityLevel!: ActivityLevel;

  @ApiProperty({ enum: GOALS })
  @IsIn(GOALS)
  goalType!: GoalType;

  @ApiPropertyOptional({ example: 75, minimum: 25, maximum: 400 })
  @IsOptional()
  @IsNumber()
  @Min(25)
  @Max(400)
  targetWeightKg?: number;

  @ApiPropertyOptional({
    example: -0.5,
    minimum: MIN_WEEKLY_CHANGE_KG,
    maximum: MAX_WEEKLY_CHANGE_KG,
    description:
      'Ritmo objetivo en kg/semana (negativo = déficit). Si se omite, se usa el del objetivo.',
  })
  @IsOptional()
  @IsNumber()
  @Min(MIN_WEEKLY_CHANGE_KG)
  @Max(MAX_WEEKLY_CHANGE_KG)
  weeklyWeightChangeKg?: number;

  @ApiPropertyOptional({
    example: 'Europe/Madrid',
    description:
      'Zona horaria IANA. Decide a qué día natural se imputan comidas y entrenos.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
