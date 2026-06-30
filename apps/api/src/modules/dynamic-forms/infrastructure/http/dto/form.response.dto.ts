import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Form, FormStatus } from '../../../domain/entities/form.entity';

export class FormResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() schema: unknown;
  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }) status: FormStatus;
  @ApiPropertyOptional({ nullable: true }) createdById: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(form: Form): FormResponseDto {
    const dto = new FormResponseDto();
    dto.id = form.id;
    dto.title = form.title;
    dto.description = form.description;
    dto.schema = form.schema;
    dto.status = form.status;
    dto.createdById = form.createdById;
    dto.createdAt = form.createdAt;
    dto.updatedAt = form.updatedAt;
    return dto;
  }
}
