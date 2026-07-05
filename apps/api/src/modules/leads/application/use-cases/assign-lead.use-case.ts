import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../domain/entities/lead.entity';
import { LeadNotFoundError } from '../../domain/errors/lead-not-found.error';
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

export interface AssignLeadInput {
  ownerId: string;
  actorId: string | null;
}

@Injectable()
export class AssignLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY)
    private readonly activities: LeadActivityRepositoryPort,
    @Inject(LEAD_EVENT_PUBLISHER)
    private readonly events: LeadEventPublisherPort,
  ) {}

  async execute(id: string, input: AssignLeadInput): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new LeadNotFoundError(id);

    const previousOwnerId = lead.ownerId;
    if (previousOwnerId === input.ownerId) return lead;

    const updated = await this.leads.update(id, { ownerId: input.ownerId });

    await this.activities.append({
      leadId: id,
      type: 'ASSIGNMENT',
      body: 'Responsable actualizado.',
      meta: { from: previousOwnerId, to: input.ownerId },
      actorId: input.actorId,
    });

    await this.events.publish({
      type: 'lead.assigned',
      leadId: id,
      actorId: input.actorId,
      payload: { ownerId: input.ownerId, previousOwnerId },
    });

    return updated;
  }
}
