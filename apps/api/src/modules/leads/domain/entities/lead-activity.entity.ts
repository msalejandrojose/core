import type { LeadActivityType } from '@core/shared-types';

export type { LeadActivityType };

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  body: string | null;
  meta: unknown;
  actorId: string | null;
  createdAt: Date;
}
