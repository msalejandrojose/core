import { Inject, Injectable } from '@nestjs/common';
import { LeadActivity } from '../../domain/entities/lead-activity.entity';
import { LeadNotFoundError } from '../../domain/errors/lead-not-found.error';
import {
  LEAD_REPOSITORY,
  type LeadRepositoryPort,
} from '../ports/lead-repository.port';
import {
  LEAD_ACTIVITY_REPOSITORY,
  type LeadActivityRepositoryPort,
} from '../ports/lead-activity-repository.port';

export interface AddLeadNoteInput {
  body: string;
  actorId: string | null;
}

@Injectable()
export class AddLeadNoteUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY)
    private readonly activities: LeadActivityRepositoryPort,
  ) {}

  async execute(id: string, input: AddLeadNoteInput): Promise<LeadActivity> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new LeadNotFoundError(id);

    return this.activities.append({
      leadId: id,
      type: 'NOTE',
      body: input.body,
      meta: null,
      actorId: input.actorId,
    });
  }
}
