import { Inject, Injectable } from '@nestjs/common';
import { evaluateMatch } from '../../domain/match/match-evaluator';
import { MatchExpression } from '../../domain/match/match-expression';
import { WorkflowEvent } from '../../domain/entities/event.entity';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../ports/event-repository.port';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type WorkflowDefinitionRepositoryPort,
} from '../ports/workflow-definition-repository.port';
import {
  WORKFLOW_TRIGGER_REPOSITORY,
  type WorkflowTriggerRepositoryPort,
} from '../ports/workflow-trigger-repository.port';
import { TargetDescriptor } from '../ports/target-resolver.port';
import { StartWorkflowRunsUseCase } from './start-workflow-runs.use-case';

export interface RegisterEventInput {
  type: string;
  payload: unknown;
  sourceUserId?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

// Punto de entrada de cualquier evento (spec §6, entrypoint 1). Persiste el
// Event (deduplicando por idempotencyKey), busca triggers EVENT de definiciones
// activas, y para cada match delega en StartWorkflowRuns (que hace el fan-out
// por target si el trigger lo declara, enriquece el contexto y avanza).
@Injectable()
export class RegisterEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
    @Inject(WORKFLOW_TRIGGER_REPOSITORY)
    private readonly triggers: WorkflowTriggerRepositoryPort,
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    private readonly start: StartWorkflowRunsUseCase,
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

      await this.start.execute({
        definition,
        event,
        triggerKind: 'event',
        target: (trigger.target ?? null) as TargetDescriptor | null,
      });
    }

    return event;
  }
}
