import { Inject, Injectable } from '@nestjs/common';
import type { LeadSource } from '@core/shared-types';
import { Lead } from '../../domain/entities/lead.entity';
import {
  normalizeEmail,
  normalizePhone,
} from '../../domain/lead-normalization';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
} from '../ports/lead-repository.port';
import {
  LEAD_ACTIVITY_REPOSITORY,
  type LeadActivityRepositoryPort,
} from '../ports/lead-activity-repository.port';
import {
  LEAD_EVENT_PUBLISHER,
  type LeadEventPublisherPort,
} from '../ports/lead-event-publisher.port';

export interface CaptureLeadInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  source?: LeadSource;
  formResponseId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  customFields?: unknown;
  consentGiven?: boolean;
  createdById?: string | null;
}

/**
 * Punto de entrada de captura (público / API). Deduplica por respuesta de
 * formulario, email normalizado y teléfono antes de crear un lead nuevo
 * (spec `leads` §7). Emite los eventos de dominio tras persistir.
 */
@Injectable()
export class CaptureLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY)
    private readonly activities: LeadActivityRepositoryPort,
    @Inject(LEAD_EVENT_PUBLISHER)
    private readonly events: LeadEventPublisherPort,
  ) {}

  async execute(input: CaptureLeadInput): Promise<Lead> {
    // 1. Idempotencia: misma respuesta de formulario → no crear otro lead.
    if (input.formResponseId) {
      const existing = await this.leads.findByFormResponseId(
        input.formResponseId,
      );
      if (existing) return existing;
    }

    const emailNormalized = normalizeEmail(input.email);
    const phoneNormalized = normalizePhone(input.phone);

    // 2. Dedupe contra un lead abierto por email o teléfono.
    const duplicate = emailNormalized
      ? await this.leads.findOpenByEmailNormalized(emailNormalized)
      : phoneNormalized
        ? await this.leads.findOpenByPhone(phoneNormalized)
        : null;

    if (duplicate) {
      await this.activities.append({
        leadId: duplicate.id,
        type: 'FORM_SUBMISSION',
        body: 'Reenvío de contacto del mismo lead.',
        meta: input.formResponseId
          ? { formResponseId: input.formResponseId }
          : null,
        actorId: input.createdById ?? null,
      });
      await this.events.publish({
        type: 'lead.re_engaged',
        leadId: duplicate.id,
        actorId: input.createdById ?? null,
        payload: { formResponseId: input.formResponseId ?? null },
      });
      return duplicate;
    }

    // 3. Alta nueva.
    const lead = await this.leads.create({
      email: input.email ?? null,
      emailNormalized,
      phone: input.phone ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      company: input.company ?? null,
      ownerId: null,
      source: input.source ?? 'WEB_FORM',
      formResponseId: input.formResponseId ?? null,
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
      payload: {
        email: lead.email,
        source: lead.source,
        formResponseId: lead.formResponseId,
      },
    });

    return lead;
  }
}
