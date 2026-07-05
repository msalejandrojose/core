import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LEAD_ACTIVITY_TYPES, type LeadActivityType } from '@core/shared-types';
import { type LeadActivity } from '../../../domain/entities/lead-activity.entity';

export class LeadActivityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() leadId: string;
  @ApiProperty({ enum: LEAD_ACTIVITY_TYPES }) type: LeadActivityType;
  @ApiPropertyOptional({ nullable: true }) body: string | null;
  @ApiPropertyOptional({ nullable: true }) meta: unknown;
  @ApiPropertyOptional({ nullable: true }) actorId: string | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(activity: LeadActivity): LeadActivityResponseDto {
    const dto = new LeadActivityResponseDto();
    dto.id = activity.id;
    dto.leadId = activity.leadId;
    dto.type = activity.type;
    dto.body = activity.body;
    dto.meta = activity.meta ?? null;
    dto.actorId = activity.actorId;
    dto.createdAt = activity.createdAt;
    return dto;
  }
}
