import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { LeadActivity } from '../../domain/entities/lead-activity.entity';
import { LeadNotFoundError } from '../../domain/errors/lead-not-found.error';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
} from '../ports/lead-repository.port';
import {
  LEAD_ACTIVITY_REPOSITORY,
  type LeadActivityRepositoryPort,
  type ListLeadActivitiesOptions,
} from '../ports/lead-activity-repository.port';

@Injectable()
export class ListLeadActivitiesUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY)
    private readonly activities: LeadActivityRepositoryPort,
  ) {}

  async execute(
    leadId: string,
    opts: ListLeadActivitiesOptions,
  ): Promise<CursorPage<LeadActivity>> {
    const lead = await this.leads.findById(leadId);
    if (!lead) throw new LeadNotFoundError(leadId);
    return this.activities.listByLead(leadId, opts);
  }
}
