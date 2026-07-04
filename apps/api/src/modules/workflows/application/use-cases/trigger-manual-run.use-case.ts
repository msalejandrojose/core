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
import { TargetDescriptor } from '../ports/target-resolver.port';
import { StartWorkflowRunsUseCase } from './start-workflow-runs.use-case';

// Disparo manual / inmediato (spec §6.5): el "click de un botón". Crea un Event
// sintético `workflow.manual.<key>` y arranca la versión ACTIVA de la
// definición. Si se pasa un `target` (u override del declarado en el DSL), hace
// fan-out: un run por entidad resuelta.
@Injectable()
export class TriggerManualRunUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
    private readonly start: StartWorkflowRunsUseCase,
  ) {}

  async execute(
    key: string,
    payload: unknown,
    target?: TargetDescriptor | null,
  ): Promise<WorkflowRun[]> {
    const definition = await this.definitions.findActiveByKey(key);
    if (!definition) throw new WorkflowDefinitionNotFoundError(key);

    const event = await this.events.create({
      type: `workflow.manual.${key}`,
      payload: payload ?? {},
    });

    return this.start.execute({
      definition,
      event,
      triggerKind: 'manual',
      target: target ?? null,
    });
  }
}
