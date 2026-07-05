import type { LeadActivityType } from '@core/shared-types';
import { LeadActivity } from '../../domain/entities/lead-activity.entity';

export interface LeadActivityRow {
  id: string;
  leadId: string;
  type: string;
  body: string | null;
  meta: unknown;
  actorId: string | null;
  createdAt: Date;
}

export function toLeadActivityDomain(row: LeadActivityRow): LeadActivity {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.type as LeadActivityType,
    body: row.body,
    meta: row.meta ?? null,
    actorId: row.actorId,
    createdAt: row.createdAt,
  };
}
