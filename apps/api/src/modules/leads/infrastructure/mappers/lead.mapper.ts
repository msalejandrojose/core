import type { LeadSource, LeadStatus } from '@core/shared-types';
import { Lead } from '../../domain/entities/lead.entity';

interface LeadTagRow {
  tag: { id: string; name: string; color: string | null };
}

export interface LeadRow {
  id: string;
  email: string | null;
  emailNormalized: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status: string;
  score: number;
  ownerId: string | null;
  source: string;
  formResponseId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  customFields: unknown;
  consentGiven: boolean;
  consentAt: Date | null;
  convertedToUserId: string | null;
  convertedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: LeadTagRow[];
}

export function toLeadDomain(row: LeadRow): Lead {
  return {
    id: row.id,
    email: row.email,
    emailNormalized: row.emailNormalized,
    phone: row.phone,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
    status: row.status as LeadStatus,
    score: row.score,
    ownerId: row.ownerId,
    source: row.source as LeadSource,
    formResponseId: row.formResponseId,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    customFields: row.customFields ?? null,
    consentGiven: row.consentGiven,
    consentAt: row.consentAt,
    convertedToUserId: row.convertedToUserId,
    convertedAt: row.convertedAt,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: (row.tags ?? []).map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
    })),
  };
}
