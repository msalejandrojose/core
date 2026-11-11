import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MyProfile } from '../../../application/use-cases/get-my-profile.use-case';
import type {
  ActivityLevel,
  GoalType,
  Sex,
} from '../../../domain/entities/nutre-profile.entity';

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'] }) sex: Sex | null;
  @ApiPropertyOptional({ example: '1996-11-10' }) birthDate: string | null;
  @ApiPropertyOptional({ example: 178 }) heightCm: number | null;
  @ApiProperty({
    enum: ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'],
  })
  activityLevel: ActivityLevel;
  @ApiProperty({ enum: ['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE'] })
  goalType: GoalType;
  @ApiPropertyOptional({ example: 75 }) targetWeightKg: number | null;
  @ApiPropertyOptional({ example: -0.5 }) weeklyWeightChangeKg: number | null;

  @ApiPropertyOptional({
    example: 1780,
    description: 'Metabolismo basal estimado (Mifflin-St Jeor).',
  })
  bmrKcal: number | null;
  @ApiPropertyOptional({
    example: 2759,
    description: 'Gasto diario total estimado.',
  })
  tdeeKcal: number | null;
  @ApiPropertyOptional({ example: 2209, description: 'kcal diarias objetivo.' })
  dailyKcalTarget: number | null;
  @ApiPropertyOptional({ example: 160 }) proteinTargetG: number | null;
  @ApiPropertyOptional({ example: 214 }) carbsTargetG: number | null;
  @ApiPropertyOptional({ example: 56 }) fatTargetG: number | null;

  @ApiProperty({ example: 'Europe/Madrid' }) timezone: string;
  @ApiPropertyOptional({
    example: 80.4,
    description: 'Último peso registrado.',
  })
  currentWeightKg: number | null;
  @ApiPropertyOptional() onboardedAt: Date | null;

  static from({ profile, currentWeightKg }: MyProfile): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    dto.id = profile.id;
    dto.sex = profile.sex;
    dto.birthDate = profile.birthDate;
    dto.heightCm = profile.heightCm;
    dto.activityLevel = profile.activityLevel;
    dto.goalType = profile.goalType;
    dto.targetWeightKg = profile.targetWeightKg;
    dto.weeklyWeightChangeKg = profile.weeklyWeightChangeKg;
    dto.bmrKcal = profile.bmrKcal;
    dto.tdeeKcal = profile.tdeeKcal;
    dto.dailyKcalTarget = profile.dailyKcalTarget;
    dto.proteinTargetG = profile.proteinTargetG;
    dto.carbsTargetG = profile.carbsTargetG;
    dto.fatTargetG = profile.fatTargetG;
    dto.timezone = profile.timezone;
    dto.currentWeightKg = currentWeightKg;
    dto.onboardedAt = profile.onboardedAt;
    return dto;
  }
}
