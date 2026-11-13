import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ActivityType } from '../../../domain/entities/activity-type.entity';

export class ActivityTypeResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ example: 'running' }) code: string | null;
  @ApiProperty({ example: 'Correr' }) name: string;
  @ApiProperty({
    example: 9.8,
    description: 'MET: equivalente metabólico, base del cálculo de kcal.',
  })
  met: number;
  @ApiProperty({
    example: 'RUN',
    description: 'Disciplina (STRENGTH admite series).',
  })
  kind: string;
  @ApiPropertyOptional({ example: 'walk' }) icon: string | null;
  @ApiProperty({
    example: false,
    description: 'true si es una actividad creada por el propio usuario.',
  })
  isCustom: boolean;

  static from(t: ActivityType): ActivityTypeResponseDto {
    const dto = new ActivityTypeResponseDto();
    dto.id = t.id;
    dto.code = t.code;
    dto.name = t.name;
    dto.met = t.met;
    dto.kind = t.kind;
    dto.icon = t.icon;
    dto.isCustom = t.ownerUserId !== null;
    return dto;
  }
}
