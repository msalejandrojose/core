import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ type: String, nullable: true }) color: string | null;
}

export class LeadResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: String, nullable: true }) email: string | null;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ type: String, nullable: true }) firstName: string | null;
  @ApiProperty({ type: String, nullable: true }) lastName: string | null;
  @ApiProperty({ type: String, nullable: true }) company: string | null;
  @ApiProperty({ enum: LEAD_STATUSES }) status: LeadStatus;
  @ApiProperty() score: number;
  @ApiProperty({ type: String, nullable: true }) ownerId: string | null;
  @ApiProperty({ enum: LEAD_SOURCES }) source: LeadSource;
  @ApiProperty({ type: String, nullable: true }) formResponseId: string | null;
  @ApiProperty({ type: String, nullable: true }) utmSource: string | null;
  @ApiProperty({ type: String, nullable: true }) utmMedium: string | null;
  @ApiProperty({ type: String, nullable: true }) utmCampaign: string | null;
  @ApiProperty({ type: Object, nullable: true }) customFields: unknown;
  @ApiProperty() consentGiven: boolean;
  @ApiProperty({ type: Date, nullable: true }) consentAt: Date | null;
  @ApiProperty({ type: String, nullable: true }) convertedToUserId:
    | string
    | null;
  @ApiProperty({ type: Date, nullable: true }) convertedAt: Date | null;
  @ApiProperty({ type: String, nullable: true }) createdById: string | null;
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
