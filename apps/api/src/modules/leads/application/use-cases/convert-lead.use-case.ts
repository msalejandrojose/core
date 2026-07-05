import { Inject, Injectable } from '@nestjs/common';
import { Lead } from '../../domain/entities/lead.entity';
import { LeadNotFoundError } from '../../domain/errors/lead-not-found.error';
import { InvalidLeadStatusTransitionError } from '../../domain/errors/invalid-lead-status-transition.error';
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

export interface ConvertLeadInput {
  userId: string;
  actorId: string | null;
}

/** Cierra el lead como ganado y lo vincula al `User` creado (spec `leads` §10). */
@Injectable()
export class ConvertLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY)
    private readonly activities: LeadActivityRepositoryPort,
    @Inject(LEAD_EVENT_PUBLISHER)
    private readonly events: LeadEventPublisherPort,
  ) {}

  async execute(id: string, input: ConvertLeadInput): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new LeadNotFoundError(id);

    if (lead.status === 'WON') {
      throw new InvalidLeadStatusTransitionError('WON', 'WON');
    }

    const from = lead.status;
    const updated = await this.leads.update(id, {
      status: 'WON',
      convertedToUserId: input.userId,
      convertedAt: new Date(),
    });

    await this.activities.append({
      leadId: id,
      type: 'CONVERSION',
      body: 'Lead convertido en cliente.',
      meta: { userId: input.userId, from },
      actorId: input.actorId,
    });

    await this.events.publish({
      type: 'lead.status_changed',
      leadId: id,
      actorId: input.actorId,
      payload: { from, to: 'WON' },
    });
    await this.events.publish({
      type: 'lead.converted',
      leadId: id,
      actorId: input.actorId,
      payload: { userId: input.userId },
    });

    return updated;
  }
}
