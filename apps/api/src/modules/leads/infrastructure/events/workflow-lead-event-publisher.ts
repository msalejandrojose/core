import { Injectable, Logger } from '@nestjs/common';
import { RegisterEventUseCase } from '../../../workflows/application/use-cases/register-event.use-case';
import {
  LeadDomainEvent,
  LeadEventPublisherPort,
} from '../../application/ports/lead-event-publisher.port';

/**
 * Traduce los hechos de dominio de leads a eventos del motor de `workflows`
 * (spec `leads` §9). La publicación es post-commit y tolerante a fallos: si el
 * motor de eventos falla, se loguea pero NO se propaga — el cambio de dato del
 * lead ya está persistido y no debe revertirse.
 */
@Injectable()
export class WorkflowLeadEventPublisher implements LeadEventPublisherPort {
  private readonly logger = new Logger(WorkflowLeadEventPublisher.name);

  constructor(private readonly registerEvent: RegisterEventUseCase) {}

  async publish(event: LeadDomainEvent): Promise<void> {
    try {
      await this.registerEvent.execute({
        type: event.type,
        payload: { leadId: event.leadId, ...event.payload },
        sourceUserId: event.actorId,
        correlationId: event.leadId,
        idempotencyKey: `${event.type}:${event.leadId}:${Date.now()}`,
      });
    } catch (err) {
      this.logger.error(
        `No se pudo publicar el evento ${event.type} del lead ${event.leadId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
