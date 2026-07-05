import { z } from 'zod';

export const LeadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
  'UNQUALIFIED',
]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export const LEAD_STATUSES = LeadStatusSchema.options;

export const LeadSourceSchema = z.enum([
  'WEB_FORM',
  'MANUAL',
  'IMPORT',
  'API',
  'REFERRAL',
  'OTHER',
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;
export const LEAD_SOURCES = LeadSourceSchema.options;

export const LeadActivityTypeSchema = z.enum([
  'NOTE',
  'STATUS_CHANGE',
  'ASSIGNMENT',
  'SCORE_CHANGE',
  'FORM_SUBMISSION',
  'EMAIL',
  'CALL',
  'MEETING',
  'CONVERSION',
  'SYSTEM',
]);
export type LeadActivityType = z.infer<typeof LeadActivityTypeSchema>;
export const LEAD_ACTIVITY_TYPES = LeadActivityTypeSchema.options;

/**
 * Estados desde los que un lead se considera "cerrado" — la deduplicación de
 * captura solo reabre/agrupa contra leads que NO estén cerrados.
 */
export const CLOSED_LEAD_STATUSES: readonly LeadStatus[] = [
  'WON',
  'LOST',
  'UNQUALIFIED',
];

export function isClosedLeadStatus(status: LeadStatus): boolean {
  return CLOSED_LEAD_STATUSES.includes(status);
}

/**
 * Máquina de estados del pipeline (ver spec del módulo `leads`, §10). `WON`
 * no se alcanza por transición directa: requiere el caso de uso de conversión.
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ['CONTACTED', 'UNQUALIFIED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'UNQUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST', 'UNQUALIFIED'],
  PROPOSAL: ['WON', 'LOST'],
  WON: [],
  LOST: ['NEW'],
  UNQUALIFIED: ['NEW'],
};

export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_STATUS_TRANSITIONS[from].includes(to);
}
