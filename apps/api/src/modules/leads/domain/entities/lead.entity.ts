import type { LeadStatus, LeadSource } from '@core/shared-types';

export type { LeadStatus, LeadSource };

export interface LeadTagRef {
  id: string;
  name: string;
  color: string | null;
}

export interface Lead {
  id: string;

  // Identidad del contacto
  email: string | null;
  emailNormalized: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;

  // Ciclo de vida
  status: LeadStatus;
  score: number;
  ownerId: string | null;

  // Atribución / origen
  source: LeadSource;
  formResponseId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;

  // Datos flexibles
  customFields: unknown;

  // Consentimiento (GDPR)
  consentGiven: boolean;
  consentAt: Date | null;

  // Conversión
  convertedToUserId: string | null;
  convertedAt: Date | null;

  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;

  tags: LeadTagRef[];
}
