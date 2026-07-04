import { Inject, Injectable } from '@nestjs/common';
import { evaluateMatch } from '../../domain/match/match-evaluator';
import { MatchExpression } from '../../domain/match/match-expression';
import { WorkflowEvent } from '../../domain/entities/event.entity';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../ports/event-repository.port';
import {
  PENDING_ACTION_REPOSITORY,
  type PendingActionRepositoryPort,
} from '../ports/pending-action-repository.port';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type WorkflowDefinitionRepositoryPort,
} from '../ports/workflow-definition-repository.port';
import {
  WORKFLOW_RUN_REPOSITORY,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';
import {
  WORKFLOW_TRIGGER_REPOSITORY,
  type WorkflowTriggerRepositoryPort,
} from '../ports/workflow-trigger-repository.port';
import {
  CONTEXT_ENRICHER_REGISTRY,
  type ContextEnricherRegistryPort,
} from '../ports/context-enricher-registry.port';
import { AdvanceWorkflowRunUseCase } from './advance-workflow-run.use-case';

export interface RegisterEventInput {
  type: string;
  payload: unknown;
  sourceUserId?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

// Punto de entrada de cualquier evento (spec §6, entrypoint 1). Persiste el
// Event (deduplicando por idempotencyKey), busca triggers EVENT de definiciones
// activas, y para cada match crea un run y lo avanza (o lo encola como
// PENDING_START si se supera maxConcurrentRuns).
@Injectable()
export class RegisterEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
    @Inject(WORKFLOW_TRIGGER_REPOSITORY)
    private readonly triggers: WorkflowTriggerRepositoryPort,
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
    @Inject(PENDING_ACTION_REPOSITORY)
    private readonly pending: PendingActionRepositoryPort,
    @Inject(CONTEXT_ENRICHER_REGISTRY)
    private readonly enrichers: ContextEnricherRegistryPort,
    private readonly advance: AdvanceWorkflowRunUseCase,
  ) {}

  async execute(input: RegisterEventInput): Promise<WorkflowEvent> {
    if (input.idempotencyKey) {
      const existing = await this.events.findByIdempotencyKey(
        input.idempotencyKey,
      );
      if (existing) return existing; // dedupe: no se re-dispara nada
    }

    const event = await this.events.create(input);

    const triggers = await this.triggers.findActiveEventTriggers(event.type);
    for (const trigger of triggers) {
      const match = (trigger.matchExpression ?? null) as MatchExpression | null;
      if (!evaluateMatch(match, event.payload)) continue;

      const definition = await this.definitions.findById(trigger.definitionId);
      if (!definition) continue;

      const max = definition.dsl.meta?.maxConcurrentRuns;
      if (max != null) {
        const active = await this.runs.countActiveByDefinition(definition.id);
        if (active >= max) {
          await this.pending.create({
            definitionId: definition.id,
            triggerEventId: event.id,
            kind: 'PENDING_START',
          });
          continue;
        }
      }

      const context = await this.enrichers.enrich(
        { ...(definition.dsl.context ?? {}) },
        {
          definitionKey: definition.key,
          trigger: 'event',
          event: {
            type: event.type,
            payload: event.payload,
            sourceUserId: event.sourceUserId,
            correlationId: event.correlationId,
            occurredAt: event.occurredAt,
          },
        },
      );

      const run = await this.runs.create({
        definitionId: definition.id,
        triggerEventId: event.id,
        context,
        currentStepKey: null,
      });
      await this.advance.execute(run.id);
    }

    return event;
  }
}
