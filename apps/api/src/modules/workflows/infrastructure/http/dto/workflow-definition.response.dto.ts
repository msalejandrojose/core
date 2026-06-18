import { ApiProperty } from '@nestjs/swagger';
import { WorkflowDefinition } from '../../../domain/entities/workflow-definition.entity';

export class WorkflowDefinitionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() key: string;
  @ApiProperty() version: number;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: 'object', additionalProperties: true }) dsl: unknown;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ nullable: true }) publishedAt: Date | null;

  static fromDomain(def: WorkflowDefinition): WorkflowDefinitionResponseDto {
    const dto = new WorkflowDefinitionResponseDto();
    dto.id = def.id;
    dto.key = def.key;
    dto.version = def.version;
    dto.name = def.name;
    dto.description = def.description;
    dto.isActive = def.isActive;
    dto.dsl = def.dsl;
    dto.createdAt = def.createdAt;
    dto.publishedAt = def.publishedAt;
    return dto;
  }
}
