import type { LeadActivityType } from '@core/shared-types';
import { CursorPage } from '../../../../shared/pagination';
import { LeadActivity } from '../../domain/entities/lead-activity.entity';

export const LEAD_ACTIVITY_REPOSITORY = Symbol(
  'LEADS_LEAD_ACTIVITY_REPOSITORY',
);

export interface CreateLeadActivityData {
  leadId: string;
  type: LeadActivityType;
  body: string | null;
  meta: unknown;
  actorId: string | null;
}

export interface ListLeadActivitiesOptions {
  limit: number;
  cursor?: string;
}

export interface LeadActivityRepositoryPort {
  append(data: CreateLeadActivityData): Promise<LeadActivity>;
  listByLead(
    leadId: string,
    opts: ListLeadActivitiesOptions,
  ): Promise<CursorPage<LeadActivity>>;
}
