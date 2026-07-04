import { Inject, Injectable } from '@nestjs/common';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import { WorkflowDefinitionNotFoundError } from '../../domain/errors/workflow-definition-not-found.error';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../ports/event-repository.port';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type WorkflowDefinitionRepositoryPort,
} from '../ports/workflow-definition-repository.port';
import {
  WORKFLOW_RUN_REPOSITORY,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';
import {
  CONTEXT_ENRICHER_REGISTRY,
  type ContextEnricherRegistryPort,
} from '../ports/context-enricher-registry.port';
import { AdvanceWorkflowRunUseCase } from './advance-workflow-run.use-case';

// Disparo manual (spec §6.5): crea un Event sintético `workflow.manual.<key>` y
// arranca un run de la versión ACTIVA de la definición, avanzándolo.
@Injectable()
export class TriggerManualRunUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
    @Inject(CONTEXT_ENRICHER_REGISTRY)
    private readonly enrichers: ContextEnricherRegistryPort,
    private readonly advance: AdvanceWorkflowRunUseCase,
  ) {}

  async execute(key: string, payload: unknown): Promise<WorkflowRun> {
    const definition = await this.definitions.findActiveByKey(key);
    if (!definition) throw new WorkflowDefinitionNotFoundError(key);

    const event = await this.events.create({
      type: `workflow.manual.${key}`,
      payload: payload ?? {},
    });
    const context = await this.enrichers.enrich(
      { ...(definition.dsl.context ?? {}) },
      {
        definitionKey: definition.key,
        trigger: 'manual',
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

    const reloaded = await this.runs.findById(run.id);
    return reloaded ?? run;
  }
}
