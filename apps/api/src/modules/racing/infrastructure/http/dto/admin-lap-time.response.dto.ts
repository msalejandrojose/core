import { ApiProperty } from '@nestjs/swagger';
import { LapTime } from '../../../domain/entities/lap-time.entity';

export class AdminLapTimeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() trackId!: string;
  @ApiProperty({ example: 42350 }) durationMs!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Null = tiempo válido.',
  })
  invalidatedAt!: Date | null;

  static fromLapTime(lap: LapTime): AdminLapTimeResponseDto {
    const dto = new AdminLapTimeResponseDto();
    dto.id = lap.id;
    dto.userId = lap.userId;
    dto.trackId = lap.trackId;
    dto.durationMs = lap.durationMs;
    dto.createdAt = lap.createdAt;
    dto.invalidatedAt = lap.invalidatedAt;
    return dto;
  }
}
