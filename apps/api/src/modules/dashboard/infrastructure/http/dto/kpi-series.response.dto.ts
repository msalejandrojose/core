import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum } from 'class-validator';
import type { KpiSeriesPoint } from '../../../application/kpi-definition';

export const GRANULARITIES = ['hour', 'day', 'week', 'month'] as const;

export class KpiSeriesQueryDto {
  @ApiProperty({ example: '2026-06-01', description: 'Start date (YYYY-MM-DD).' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-06-30', description: 'End date (YYYY-MM-DD).' })
  @IsDateString()
  to!: string;

  @ApiProperty({ enum: GRANULARITIES, example: 'day' })
  @IsEnum(GRANULARITIES)
  granularity!: (typeof GRANULARITIES)[number];
}

class KpiSeriesPointDto {
  @ApiProperty({ description: 'Bucket start (truncated to granularity).' })
  t!: string;

  @ApiProperty({ nullable: true })
  v!: number | null;
}

export class KpiSeriesResponseDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ enum: GRANULARITIES })
  granularity!: string;

  @ApiProperty({ type: [KpiSeriesPointDto] })
  points!: KpiSeriesPoint[];
}
