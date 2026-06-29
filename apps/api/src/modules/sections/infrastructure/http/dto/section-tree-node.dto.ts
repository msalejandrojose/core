import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SectionTreeNode } from '../../../application/use-cases/get-section-tree.use-case';
import type { SectionScope } from '../../../domain/entities/section.entity';

export class SectionTreeNodeDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) icon!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) route!: string | null;
  @ApiProperty({ enum: ['BACKOFFICE', 'APP', 'SHARED'] }) scope!: SectionScope;
  @ApiProperty() order!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [String] }) apiRequirements!: string[];
  @ApiProperty({ type: () => [SectionTreeNodeDto] })
  children!: SectionTreeNodeDto[];

  static fromDomain(node: SectionTreeNode): SectionTreeNodeDto {
    const dto = new SectionTreeNodeDto();
    dto.id = node.id;
    dto.code = node.code;
    dto.name = node.name;
    dto.icon = node.icon;
    dto.route = node.route;
    dto.scope = node.scope;
    dto.order = node.order;
    dto.isActive = node.isActive;
    dto.apiRequirements = node.apiRequirements;
    dto.children = node.children.map((c) => SectionTreeNodeDto.fromDomain(c));
    return dto;
  }
}
