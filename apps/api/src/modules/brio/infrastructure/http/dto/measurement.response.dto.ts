import { ApiProperty } from '@nestjs/swagger';
import type { BodyMeasurement } from '../../../domain/entities/body-measurement.entity';

export class MeasurementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: '2026-11-10' }) measuredOn: string;
  @ApiProperty({ example: 80.4 }) weightKg: number;
  @ApiProperty({ type: Number, nullable: true, example: 18.5 })
  bodyFatPct: number | null;
  @ApiProperty({ type: Number, nullable: true, example: 84 }) waistCm:
    | number
    | null;
  @ApiProperty({ type: String, nullable: true }) notes: string | null;

  static from(m: BodyMeasurement): MeasurementResponseDto {
    const dto = new MeasurementResponseDto();
    dto.id = m.id;
    dto.measuredOn = m.measuredOn;
    dto.weightKg = m.weightKg;
    dto.bodyFatPct = m.bodyFatPct;
    dto.waistCm = m.waistCm;
    dto.notes = m.notes;
    return dto;
  }
}
