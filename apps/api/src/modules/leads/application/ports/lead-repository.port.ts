import type { LeadSource, LeadStatus } from '@core/shared-types';
import { CursorPage } from '../../../../shared/pagination';
import { Lead } from '../../domain/entities/lead.entity';

export const LEAD_REPOSITORY = Symbol('LEADS_LEAD_REPOSITORY');

export interface CreateLeadData {
  email: string | null;
  emailNormalized: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status?: LeadStatus;
  score?: number;
  ownerId: string | null;
  source: LeadSource;
  formResponseId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  customFields: unknown;
  consentGiven: boolean;
  consentAt: Date | null;
  createdById: string | null;
}

export interface UpdateLeadPatch {
  email?: string | null;
  emailNormalized?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  status?: LeadStatus;
  score?: number;
  ownerId?: string | null;
  source?: LeadSource;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  customFields?: unknown;
  consentGiven?: boolean;
  consentAt?: Date | null;
  convertedToUserId?: string | null;
  convertedAt?: Date | null;
}

export interface ListLeadsOptions {
  limit: number;
  cursor?: string;
  status?: LeadStatus;
  source?: LeadSource;
  ownerId?: string;
  tagId?: string;
  q?: string;
}

export interface LeadRepositoryPort {
  create(data: CreateLeadData): Promise<Lead>;
  update(id: string, patch: UpdateLeadPatch): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  /** Lead ABIERTO (status ∉ {WON, LOST, UNQUALIFIED}) por email normalizado. */
  findOpenByEmailNormalized(emailNormalized: string): Promise<Lead | null>;
  /** Lead ABIERTO por teléfono (fallback de dedupe sin email). */
  findOpenByPhone(phone: string): Promise<Lead | null>;
  /** Idempotencia de captura: lead ya creado a partir de una respuesta. */
  findByFormResponseId(formResponseId: string): Promise<Lead | null>;
  list(opts: ListLeadsOptions): Promise<CursorPage<Lead>>;
  /** Reemplaza el set de etiquetas del lead (bulk). */
  setTags(leadId: string, tagIds: string[]): Promise<void>;
}
