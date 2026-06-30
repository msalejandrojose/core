import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormInstance, FormInstanceStatus, FormResponsePolicy } from '../../../domain/entities/form-instance.entity';

export class FormInstanceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() formId: string;
  @ApiProperty() hash: string;
  @ApiProperty({ enum: ['SINGLE_PER_LINK', 'SINGLE_PER_USER', 'UNLIMITED'] }) responsePolicy: FormResponsePolicy;
  @ApiProperty() requiresAuth: boolean;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) opensAt: Date | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) closesAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) maxResponses: number | null;
  @ApiProperty({ enum: ['ACTIVE', 'CLOSED'] }) status: FormInstanceStatus;
  @ApiPropertyOptional({ nullable: true }) createdById: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(instance: FormInstance): FormInstanceResponseDto {
    const dto = new FormInstanceResponseDto();
    dto.id = instance.id;
    dto.formId = instance.formId;
    dto.hash = instance.hash;
    dto.responsePolicy = instance.responsePolicy;
    dto.requiresAuth = instance.requiresAuth;
    dto.opensAt = instance.opensAt;
    dto.closesAt = instance.closesAt;
    dto.maxResponses = instance.maxResponses;
    dto.status = instance.status;
    dto.createdById = instance.createdById;
    dto.createdAt = instance.createdAt;
    dto.updatedAt = instance.updatedAt;
    return dto;
  }
}
