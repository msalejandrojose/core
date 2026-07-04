import { Inject, Injectable } from '@nestjs/common';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { InvalidWorkflowDefinitionError } from '../../domain/errors/invalid-workflow-definition.error';
import { WorkflowVersionConflictError } from '../../domain/errors/workflow-version-conflict.error';
import { workflowDslSchema } from '../../domain/dsl/workflow-dsl';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type WorkflowDefinitionRepositoryPort,
} from '../ports/workflow-definition-repository.port';
import {
  WORKFLOW_TRIGGER_REPOSITORY,
  type CreateTriggerData,
  type WorkflowTriggerRepositoryPort,
} from '../ports/workflow-trigger-repository.port';
import { CRON_CLOCK, type CronClockPort } from '../ports/cron-clock.port';

const MAX_DSL_BYTES = 64 * 1024;

// Publica una nueva versión de un workflow (spec §11). Valida el DSL con Zod y
// el tope de 64 KB, deduplica (key, version) y crea los triggers declarados.
// La PRIMERA versión de una key queda activa automáticamente; las siguientes
// nacen inactivas y se activan vía `ActivateWorkflowDefinitionUseCase`.
@Injectable()
export class PublishWorkflowDefinitionUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    @Inject(WORKFLOW_TRIGGER_REPOSITORY)
    private readonly triggers: WorkflowTriggerRepositoryPort,
    @Inject(CRON_CLOCK) private readonly cron: CronClockPort,
  ) {}

  async execute(rawDsl: unknown): Promise<WorkflowDefinition> {
    const bytes = Buffer.byteLength(JSON.stringify(rawDsl ?? {}), 'utf-8');
    if (bytes > MAX_DSL_BYTES) {
      throw new InvalidWorkflowDefinitionError(
        `El DSL ocupa ${bytes} bytes (máximo ${MAX_DSL_BYTES}).`,
      );
    }

    const parsed = workflowDslSchema.safeParse(rawDsl);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      throw new InvalidWorkflowDefinitionError(issues, {
        issues: parsed.error.issues,
      });
    }
    const dsl = parsed.data;

    if (await this.definitions.findByKeyVersion(dsl.key, dsl.version)) {
      throw new WorkflowVersionConflictError(dsl.key, dsl.version);
    }

    const isFirst = !(await this.definitions.hasAnyVersion(dsl.key));

    const definition = await this.definitions.create({
      key: dsl.key,
      version: dsl.version,
      name: dsl.name,
      description: dsl.meta?.description ?? null,
      dsl,
      isActive: isFirst,
    });

    const now = new Date();
    const triggerData: CreateTriggerData[] = dsl.triggers.map((trigger) => {
      switch (trigger.kind) {
        case 'event':
          return {
            definitionId: definition.id,
            kind: 'EVENT',
            eventType: trigger.eventType,
            matchExpression: trigger.match ?? null,
            target: trigger.target ?? null,
          };
        case 'cron': {
          // Valida la expresión (5 campos UTC) y programa el primer disparo.
          if (!this.cron.isValid(trigger.cronExpression)) {
            throw new InvalidWorkflowDefinitionError(
              `Expresión cron inválida: "${trigger.cronExpression}".`,
            );
          }
          return {
            definitionId: definition.id,
            kind: 'CRON',
            cronExpression: trigger.cronExpression,
            cronPayload: trigger.payload ?? null,
            nextFireAt: this.cron.next(trigger.cronExpression, now),
            target: trigger.target ?? null,
          };
        }
        case 'manual':
          return {
            definitionId: definition.id,
            kind: 'MANUAL',
            target: trigger.target ?? null,
          };
      }
    });
    await this.triggers.createMany(triggerData);

    return definition;
  }
}
