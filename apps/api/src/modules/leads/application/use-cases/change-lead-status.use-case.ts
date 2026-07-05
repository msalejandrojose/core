import { Inject, Injectable } from '@nestjs/common';
import { canTransitionLeadStatus, type LeadStatus } from '@core/shared-types';
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

export interface ChangeLeadStatusInput {
  to: LeadStatus;
  reason?: string | null;
  actorId: string | null;
}

/**
 * Cambia el estado validando la máquina de transiciones. `WON` no se alcanza
 * por aquí: requiere `ConvertLeadUseCase` (spec `leads` §10).
 */
@Injectable()
export class ChangeLeadStatusUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY)
    private readonly activities: LeadActivityRepositoryPort,
    @Inject(LEAD_EVENT_PUBLISHER)
    private readonly events: LeadEventPublisherPort,
  ) {}

  async execute(id: string, input: ChangeLeadStatusInput): Promise<Lead> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new LeadNotFoundError(id);

    const from = lead.status;
    const { to } = input;

    // WON solo vía conversión.
    if (to === 'WON' || !canTransitionLeadStatus(from, to)) {
      throw new InvalidLeadStatusTransitionError(from, to);
    }

    const updated = await this.leads.update(id, { status: to });

    await this.activities.append({
      leadId: id,
      type: 'STATUS_CHANGE',
      body: `${from} → ${to}`,
      meta: { from, to, reason: input.reason ?? null },
      actorId: input.actorId,
    });

    await this.events.publish({
      type: 'lead.status_changed',
      leadId: id,
      actorId: input.actorId,
      payload: { from, to },
    });

    if (to === 'LOST' || to === 'UNQUALIFIED') {
      await this.events.publish({
        type: 'lead.lost',
        leadId: id,
        actorId: input.actorId,
        payload: { status: to, reason: input.reason ?? null },
      });
    }

    return updated;
  }
}
