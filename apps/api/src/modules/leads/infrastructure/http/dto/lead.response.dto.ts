import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
} from '@core/shared-types';
import { type Lead } from '../../../domain/entities/lead.entity';

class LeadTagRefDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) color: string | null;
}

export class LeadResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) email: string | null;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiPropertyOptional({ nullable: true }) firstName: string | null;
  @ApiPropertyOptional({ nullable: true }) lastName: string | null;
  @ApiPropertyOptional({ nullable: true }) company: string | null;
  @ApiProperty({ enum: LEAD_STATUSES }) status: LeadStatus;
  @ApiProperty() score: number;
  @ApiPropertyOptional({ nullable: true }) ownerId: string | null;
  @ApiProperty({ enum: LEAD_SOURCES }) source: LeadSource;
  @ApiPropertyOptional({ nullable: true }) formResponseId: string | null;
  @ApiPropertyOptional({ nullable: true }) utmSource: string | null;
  @ApiPropertyOptional({ nullable: true }) utmMedium: string | null;
  @ApiPropertyOptional({ nullable: true }) utmCampaign: string | null;
  @ApiPropertyOptional({ nullable: true }) customFields: unknown;
  @ApiProperty() consentGiven: boolean;
  @ApiPropertyOptional({ nullable: true }) consentAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) convertedToUserId: string | null;
  @ApiPropertyOptional({ nullable: true }) convertedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) createdById: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [LeadTagRefDto] }) tags: LeadTagRefDto[];

  static fromDomain(lead: Lead): LeadResponseDto {
    const dto = new LeadResponseDto();
    dto.id = lead.id;
    dto.email = lead.email;
    dto.phone = lead.phone;
    dto.firstName = lead.firstName;
    dto.lastName = lead.lastName;
    dto.company = lead.company;
    dto.status = lead.status;
    dto.score = lead.score;
    dto.ownerId = lead.ownerId;
    dto.source = lead.source;
    dto.formResponseId = lead.formResponseId;
    dto.utmSource = lead.utmSource;
    dto.utmMedium = lead.utmMedium;
    dto.utmCampaign = lead.utmCampaign;
    dto.customFields = lead.customFields ?? null;
    dto.consentGiven = lead.consentGiven;
    dto.consentAt = lead.consentAt;
    dto.convertedToUserId = lead.convertedToUserId;
    dto.convertedAt = lead.convertedAt;
    dto.createdById = lead.createdById;
    dto.createdAt = lead.createdAt;
    dto.updatedAt = lead.updatedAt;
    dto.tags = lead.tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    }));
    return dto;
  }
}
