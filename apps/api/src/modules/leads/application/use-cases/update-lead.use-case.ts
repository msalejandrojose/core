import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../domain/entities/lead.entity';
import { LeadNotFoundError } from '../../domain/errors/lead-not-found.error';
import { normalizeEmail } from '../../domain/lead-normalization';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
} from '../ports/lead-repository.port';

export interface UpdateLeadInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  customFields?: unknown;
  consentGiven?: boolean;
}

/** Actualiza datos de contacto / atribución / consentimiento (no el pipeline). */
@Injectable()
export class UpdateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateLeadInput): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new LeadNotFoundError(id);

    const patch: Parameters<LeadRepositoryPort['update']>[1] = {};
    if (input.email !== undefined) {
      patch.email = input.email;
      patch.emailNormalized = normalizeEmail(input.email);
    }
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.firstName !== undefined) patch.firstName = input.firstName;
    if (input.lastName !== undefined) patch.lastName = input.lastName;
    if (input.company !== undefined) patch.company = input.company;
    if (input.utmSource !== undefined) patch.utmSource = input.utmSource;
    if (input.utmMedium !== undefined) patch.utmMedium = input.utmMedium;
    if (input.utmCampaign !== undefined) patch.utmCampaign = input.utmCampaign;
    if (input.customFields !== undefined)
      patch.customFields = input.customFields;
    if (input.consentGiven !== undefined) {
      patch.consentGiven = input.consentGiven;
      patch.consentAt = input.consentGiven
        ? (lead.consentAt ?? new Date())
        : null;
    }

    return this.leads.update(id, patch);
  }
}
