import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { KpiDefinition } from '../../../application/kpi-definition';

export class KpiMetaDto {
  @ApiProperty({ example: 'users.total' })
  slug!: string;

  @ApiProperty({ example: 'Usuarios totales' })
  label!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ example: 'users' })
  category!: string;

  @ApiProperty({ enum: ['count', 'bytes', 'percent', 'currency', 'duration_ms'] })
  unit!: string;

  @ApiPropertyOptional({ enum: ['integer', 'decimal', 'compact'] })
  format?: string;

  @ApiProperty({ description: 'Whether this KPI supports time-series queries.' })
  hasSeries!: boolean;
}

export class KpiCatalogResponseDto {
  @ApiProperty({ type: [KpiMetaDto] })
  kpis!: KpiMetaDto[];

  static from(defs: KpiDefinition[]): KpiCatalogResponseDto {
    const dto = new KpiCatalogResponseDto();
    dto.kpis = defs.map((d) => {
      const meta = new KpiMetaDto();
      meta.slug = d.slug;
      meta.label = d.label;
      meta.description = d.description;
      meta.category = d.category;
      meta.unit = d.unit;
      meta.format = d.format;
      meta.hasSeries = typeof d.series === 'function';
      return meta;
    });
    return dto;
  }
}
