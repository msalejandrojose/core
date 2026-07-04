import { Inject, Injectable } from '@nestjs/common';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { WorkflowEvent } from '../../domain/entities/event.entity';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import {
  CONTEXT_ENRICHER_REGISTRY,
  type ContextEnricherRegistryPort,
} from '../ports/context-enricher-registry.port';
import { EnrichmentTarget } from '../ports/context-enricher.port';
import {
  PENDING_ACTION_REPOSITORY,
  type PendingActionRepositoryPort,
} from '../ports/pending-action-repository.port';
import {
  TARGET_RESOLVER_REGISTRY,
  type TargetResolverRegistryPort,
} from '../ports/target-resolver-registry.port';
import { TargetDescriptor } from '../ports/target-resolver.port';
import {
  WORKFLOW_RUN_REPOSITORY,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';
import { AdvanceWorkflowRunUseCase } from './advance-workflow-run.use-case';

export interface StartWorkflowRunsInput {
  definition: WorkflowDefinition;
  event: WorkflowEvent | null;
  triggerKind: 'event' | 'cron' | 'manual';
  // Descriptor de target (fan-out). Ausente/null ⇒ un único run sin target.
  target?: TargetDescriptor | null;
}

// Motor compartido de arranque de runs. Es el único sitio que resuelve targets
// (fan-out: un run por entidad), enriquece el contexto inicial y avanza cada
// run. Lo usan RegisterEvent (eventos), TriggerManualRun (botón) y el scheduler
// (cron), para que la lógica de concurrencia + enriquecimiento viva en un solo
// lugar.
@Injectable()
export class StartWorkflowRunsUseCase {
  constructor(
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
    @Inject(PENDING_ACTION_REPOSITORY)
    private readonly pending: PendingActionRepositoryPort,
    @Inject(TARGET_RESOLVER_REGISTRY)
    private readonly targets: TargetResolverRegistryPort,
    @Inject(CONTEXT_ENRICHER_REGISTRY)
    private readonly enrichers: ContextEnricherRegistryPort,
    private readonly advance: AdvanceWorkflowRunUseCase,
  ) {}

  async execute(input: StartWorkflowRunsInput): Promise<WorkflowRun[]> {
    const { definition, event, triggerKind } = input;

    // `null` en la lista = un único run sin target (comportamiento clásico).
    const targets: (EnrichmentTarget | null)[] = input.target
      ? await this.targets.resolve(input.target)
      : [null];

    const created: WorkflowRun[] = [];
    const max = definition.dsl.meta?.maxConcurrentRuns;

    for (const target of targets) {
      if (max != null) {
        const active = await this.runs.countActiveByDefinition(definition.id);
        if (active >= max) {
          // Se encola el arranque; la reanudación de PENDING_START (incluida la
          // reinyección del target) es trabajo del scheduler en una iteración
          // posterior.
          await this.pending.create({
            definitionId: definition.id,
            triggerEventId: event?.id ?? null,
            kind: 'PENDING_START',
          });
          continue;
        }
      }

      const context = await this.enrichers.enrich(
        { ...(definition.dsl.context ?? {}) },
        {
          definitionKey: definition.key,
          trigger: triggerKind,
          event: event
            ? {
                type: event.type,
                payload: event.payload,
                sourceUserId: event.sourceUserId,
                correlationId: event.correlationId,
                occurredAt: event.occurredAt,
              }
            : null,
          target,
        },
      );

      const run = await this.runs.create({
        definitionId: definition.id,
        triggerEventId: event?.id ?? null,
        context,
        currentStepKey: null,
      });
      await this.advance.execute(run.id);

      const reloaded = await this.runs.findById(run.id);
      created.push(reloaded ?? run);
    }

    return created;
  }
}
