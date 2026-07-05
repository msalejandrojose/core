import { Inject, Injectable } from '@nestjs/common';
import type { LeadSource } from '@core/shared-types';
import { Lead } from '../../domain/entities/lead.entity';
import { normalizeEmail } from '../../domain/lead-normalization';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
} from '../ports/lead-repository.port';
import {
  LEAD_EVENT_PUBLISHER,
  type LeadEventPublisherPort,
} from '../ports/lead-event-publisher.port';

export interface CreateLeadInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  source?: LeadSource;
  ownerId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  customFields?: unknown;
  consentGiven?: boolean;
  createdById?: string | null;
}

/** Alta manual desde el backoffice. Sin dedupe (el operador decide). */
@Injectable()
export class CreateLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_EVENT_PUBLISHER)
    private readonly events: LeadEventPublisherPort,
  ) {}

  async execute(input: CreateLeadInput): Promise<Lead> {
    const lead = await this.leads.create({
      email: input.email ?? null,
      emailNormalized: normalizeEmail(input.email),
      phone: input.phone ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      company: input.company ?? null,
      ownerId: input.ownerId ?? null,
      source: input.source ?? 'MANUAL',
      formResponseId: null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      customFields: input.customFields ?? null,
      consentGiven: input.consentGiven ?? false,
      consentAt: input.consentGiven ? new Date() : null,
      createdById: input.createdById ?? null,
    });

    await this.events.publish({
      type: 'lead.created',
      leadId: lead.id,
      actorId: input.createdById ?? null,
      payload: { email: lead.email, source: lead.source, formResponseId: null },
    });

    return lead;
  }
}
