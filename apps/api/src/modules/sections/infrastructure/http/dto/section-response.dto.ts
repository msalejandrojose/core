import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Section } from '../../../domain/entities/section.entity';
import type { SectionScope } from '../../../domain/entities/section.entity';

export class SectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) icon!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) route!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) parentId!: string | null;
  @ApiProperty({ enum: ['BACKOFFICE', 'APP', 'SHARED'] }) scope!: SectionScope;
  @ApiProperty() order!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [String] }) apiRequirements!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static fromDomain(section: Section): SectionResponseDto {
    const dto = new SectionResponseDto();
    dto.id = section.id;
    dto.code = section.code;
    dto.name = section.name;
    dto.icon = section.icon;
    dto.route = section.route;
    dto.parentId = section.parentId;
    dto.scope = section.scope;
    dto.order = section.order;
    dto.isActive = section.isActive;
    dto.apiRequirements = section.apiRequirements;
    dto.createdAt = section.createdAt;
    dto.updatedAt = section.updatedAt;
    return dto;
  }
}
