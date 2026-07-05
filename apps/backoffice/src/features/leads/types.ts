import type {
  LeadStatus,
  LeadSource,
  LeadActivityType,
} from '@core/shared-types';
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_STATUS_TRANSITIONS,
} from '@core/shared-types';

export type { LeadStatus, LeadSource, LeadActivityType };
export { LEAD_STATUSES, LEAD_SOURCES, LEAD_STATUS_TRANSITIONS };

export interface LeadTagRef {
  id: string;
  name: string;
  color: string | null;
}

export interface LeadRow {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status: LeadStatus;
  score: number;
  ownerId: string | null;
  source: LeadSource;
  formResponseId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  customFields: unknown;
  consentGiven: boolean;
  consentAt: string | null;
  convertedToUserId: string | null;
  convertedAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  tags: LeadTagRef[];
}

export interface LeadActivityRow {
  id: string;
  leadId: string;
  type: LeadActivityType;
  body: string | null;
  meta: unknown;
  actorId: string | null;
  createdAt: string;
}

export interface LeadTag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Cualificado',
  PROPOSAL: 'Propuesta',
  WON: 'Ganado',
  LOST: 'Perdido',
  UNQUALIFIED: 'Descartado',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEB_FORM: 'Formulario web',
  MANUAL: 'Manual',
  IMPORT: 'Importación',
  API: 'API',
  REFERRAL: 'Referido',
  OTHER: 'Otro',
};

export const LEAD_ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  NOTE: 'Nota',
  STATUS_CHANGE: 'Cambio de estado',
  ASSIGNMENT: 'Asignación',
  SCORE_CHANGE: 'Cambio de score',
  FORM_SUBMISSION: 'Envío de formulario',
  EMAIL: 'Email',
  CALL: 'Llamada',
  MEETING: 'Reunión',
  CONVERSION: 'Conversión',
  SYSTEM: 'Sistema',
};

export function leadDisplayName(lead: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
}): string {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim();
  return name || lead.email || lead.company || 'Lead sin nombre';
}
