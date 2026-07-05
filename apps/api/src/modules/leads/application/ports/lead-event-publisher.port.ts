import type { LeadStatus } from '@core/shared-types';

export const LEAD_EVENT_PUBLISHER = Symbol('LEADS_LEAD_EVENT_PUBLISHER');

/**
 * Hechos de dominio que el módulo `leads` publica hacia el motor de
 * `workflows`. El módulo publica hechos, no acciones: qué automatización se
 * dispara es responsabilidad de workflows (spec `leads` §9).
 */
export type LeadDomainEvent =
  | {
      type: 'lead.created';
      leadId: string;
      actorId: string | null;
      payload: Record<string, unknown>;
    }
  | {
      type: 'lead.re_engaged';
      leadId: string;
      actorId: string | null;
      payload: Record<string, unknown>;
    }
  | {
      type: 'lead.status_changed';
      leadId: string;
      actorId: string | null;
      payload: { from: LeadStatus; to: LeadStatus };
    }
  | {
      type: 'lead.assigned';
      leadId: string;
      actorId: string | null;
      payload: { ownerId: string; previousOwnerId: string | null };
    }
  | {
      type: 'lead.converted';
      leadId: string;
      actorId: string | null;
      payload: { userId: string };
    }
  | {
      type: 'lead.lost';
      leadId: string;
      actorId: string | null;
      payload: { status: LeadStatus; reason: string | null };
    };

export interface LeadEventPublisherPort {
  publish(event: LeadDomainEvent): Promise<void>;
}
