import { ApiProperty } from '@nestjs/swagger';
import type { MyProfile } from '../../../application/use-cases/get-my-profile.use-case';
import type {
  ActivityLevel,
  GoalType,
  Sex,
} from '../../../domain/entities/brio-profile.entity';

export class ProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true, enum: ['MALE', 'FEMALE', 'OTHER'] })
  sex: Sex | null;
  @ApiProperty({ type: String, nullable: true, example: '1996-11-10' })
  birthDate: string | null;
  @ApiProperty({ type: Number, nullable: true, example: 178 })
  heightCm: number | null;
  @ApiProperty({
    enum: ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'],
  })
  activityLevel: ActivityLevel;
  @ApiProperty({ enum: ['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE'] })
  goalType: GoalType;
  @ApiProperty({ type: Number, nullable: true, example: 75 })
  targetWeightKg: number | null;
  @ApiProperty({ type: Number, nullable: true, example: -0.5 })
  weeklyWeightChangeKg: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1780,
    description: 'Metabolismo basal estimado (Mifflin-St Jeor).',
  })
  bmrKcal: number | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2759,
    description: 'Gasto diario total estimado.',
  })
  tdeeKcal: number | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 2209,
    description: 'kcal diarias objetivo.',
  })
  dailyKcalTarget: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 160 })
  proteinTargetG: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 214 })
  carbsTargetG: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 56 })
  fatTargetG: number | null;

  @ApiProperty({ example: 'Europe/Madrid' }) timezone: string;
  @ApiProperty({
    type: Number,
    nullable: true,
    example: 80.4,
    description: 'Último peso registrado.',
  })
  currentWeightKg: number | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  onboardedAt: Date | null;

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
