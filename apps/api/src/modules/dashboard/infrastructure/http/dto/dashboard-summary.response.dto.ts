import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KpiItemDto {
  @ApiProperty() slug: string;
  @ApiProperty() label: string;
  @ApiProperty() value: number;
  @ApiPropertyOptional({ enum: ['count', 'bytes', 'percent'] }) unit?: 'count' | 'bytes' | 'percent';
  @ApiPropertyOptional({ enum: ['integer', 'decimal'] }) format?: 'integer' | 'decimal';
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: [KpiItemDto] }) kpis: KpiItemDto[];
}
