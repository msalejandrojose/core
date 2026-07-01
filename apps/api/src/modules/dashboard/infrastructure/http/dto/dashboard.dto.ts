import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Dashboard, DashboardWidget, WidgetType } from '../../../domain/entities/dashboard.entity';

const WIDGET_TYPES: WidgetType[] = ['KPI_CARD', 'LINE', 'BAR', 'AREA', 'GAUGE'];

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class DashboardWidgetDto {
  @ApiProperty() id!: string;
  @ApiProperty() dashboardId!: string;
  @ApiProperty() kpiSlug!: string;
  @ApiProperty({ enum: WIDGET_TYPES }) widgetType!: WidgetType;
  @ApiProperty() x!: number;
  @ApiProperty() y!: number;
  @ApiProperty() w!: number;
  @ApiProperty() h!: number;
  @ApiPropertyOptional({ type: Object, nullable: true }) config!: Record<string, unknown> | null;
  @ApiProperty() order!: number;

  static from(w: DashboardWidget): DashboardWidgetDto {
    const dto = new DashboardWidgetDto();
    Object.assign(dto, w);
    return dto;
  }
}

export class DashboardDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty({ type: [DashboardWidgetDto] }) widgets!: DashboardWidgetDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(d: Dashboard): DashboardDto {
    const dto = new DashboardDto();
    dto.id = d.id;
    dto.userId = d.userId;
    dto.name = d.name;
    dto.isDefault = d.isDefault;
    dto.widgets = d.widgets.map(DashboardWidgetDto.from);
    dto.createdAt = d.createdAt;
    dto.updatedAt = d.updatedAt;
    return dto;
  }
}

export class DashboardListDto {
  @ApiProperty({ type: [DashboardDto] }) dashboards!: DashboardDto[];
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export class CreateDashboardDto {
  @ApiProperty({ example: 'Mi dashboard' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}

export class UpdateDashboardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}

export class LayoutWidgetDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  kpiSlug!: string;

  @ApiProperty({ enum: WIDGET_TYPES })
  @IsIn(WIDGET_TYPES)
  widgetType!: WidgetType;

  @ApiProperty() @IsInt() @Min(0) x!: number;
  @ApiProperty() @IsInt() @Min(0) y!: number;
  @ApiProperty() @IsInt() @Min(1) w!: number;
  @ApiProperty() @IsInt() @Min(1) h!: number;
  @ApiProperty() @IsInt() @Min(0) order!: number;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;
}

export class SaveLayoutDto {
  @ApiProperty({ type: [LayoutWidgetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayoutWidgetDto)
  widgets!: LayoutWidgetDto[];
}

export class AddWidgetDto {
  @ApiProperty()
  @IsString()
  kpiSlug!: string;

  @ApiProperty({ enum: WIDGET_TYPES })
  @IsIn(WIDGET_TYPES)
  widgetType!: WidgetType;

  @ApiProperty() @IsInt() @Min(0) x!: number;
  @ApiProperty() @IsInt() @Min(0) y!: number;
  @ApiProperty() @IsInt() @Min(1) w!: number;
  @ApiProperty() @IsInt() @Min(1) h!: number;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown> | null;
}
