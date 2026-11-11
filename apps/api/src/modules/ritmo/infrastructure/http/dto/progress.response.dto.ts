import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Progress } from '../../../application/use-cases/get-progress.use-case';

export class ProgressWeightPointDto {
  @ApiProperty({ example: '2026-11-10' }) day: string;
  @ApiProperty({ example: 80.4 }) weightKg: number;
  @ApiPropertyOptional({ example: 18.5 }) bodyFatPct: number | null;
}

export class ProgressDayPointDto {
  @ApiProperty({ example: '2026-11-10' }) day: string;
  @ApiProperty({ example: 1840 }) kcalIn: number;
  @ApiProperty({ example: 336 }) kcalBurned: number;
  @ApiPropertyOptional({ example: 2209 }) kcalTarget: number | null;
}

export class ProgressResponseDto {
  @ApiProperty({ example: '2026-10-12' }) from: string;
  @ApiProperty({ example: '2026-11-10' }) to: string;
  @ApiProperty({ type: [ProgressWeightPointDto] })
  weights: ProgressWeightPointDto[];
  @ApiProperty({ type: [ProgressDayPointDto] }) days: ProgressDayPointDto[];

  static from(p: Progress): ProgressResponseDto {
    const dto = new ProgressResponseDto();
    dto.from = p.from;
    dto.to = p.to;
    dto.weights = p.measurements.map((m) => {
      const point = new ProgressWeightPointDto();
      point.day = m.measuredOn;
      point.weightKg = m.weightKg;
      point.bodyFatPct = m.bodyFatPct;
      return point;
    });
    dto.days = p.logs.map((l) => {
      const point = new ProgressDayPointDto();
      point.day = l.logDate;
      point.kcalIn = l.kcalIn;
      point.kcalBurned = l.kcalBurned;
      point.kcalTarget = l.kcalTarget;
      return point;
    });
    return dto;
  }
}
