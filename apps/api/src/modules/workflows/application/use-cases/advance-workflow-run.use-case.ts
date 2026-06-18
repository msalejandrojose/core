import { Inject, Injectable, Logger } from '@nestjs/common';
import { EngineActionsExecutor } from '../../infrastructure/engine/engine-actions.executor';
import {
  findStep,
  isEngineAction,
  resolveNextStepKey,
} from '../../domain/dsl/workflow-dsl';
import {
  ACTION_HANDLER_REGISTRY,
  type ActionHandlerRegistryPort,
} from '../ports/action-handler-registry.port';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../ports/event-repository.port';
import {
  TEMPLATE_EVALUATOR,
  type TemplateEvaluatorPort,
  type TemplateScope,
} from '../ports/template-evaluator.port';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type WorkflowDefinitionRepositoryPort,
} from '../ports/workflow-definition-repository.port';
import {
  WORKFLOW_RUN_REPOSITORY,
  type UpdateRunData,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';
import {
  WORKFLOW_STEP_REPOSITORY,
  type WorkflowStepRepositoryPort,
} from '../ports/workflow-step-repository.port';

// Tope de steps procesados en una sola pasada síncrona, como guard-rail ante
// ciclos en el DSL (p.ej. branch que vuelve a sí mismo).
const MAX_STEPS_PER_PASS = 100;

// Motor de avance (spec §6.1), versión SÍNCRONA de v1: avanza el run step a
// step hasta que pausa (delay/wait → WAITING), termina (COMPLETED) o falla
// (FAILED). El locking optimista, los retries y la reanudación de pausas son
// iteraciones posteriores (scheduler).
@Injectable()
export class AdvanceWorkflowRunUseCase {
  private readonly logger = new Logger(AdvanceWorkflowRunUseCase.name);

  constructor(
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    @Inject(WORKFLOW_STEP_REPOSITORY)
    private readonly steps: WorkflowStepRepositoryPort,
    @Inject(EVENT_REPOSITORY)
    private readonly events: EventRepositoryPort,
    @Inject(ACTION_HANDLER_REGISTRY)
    private readonly registry: ActionHandlerRegistryPort,
    @Inject(TEMPLATE_EVALUATOR)
    private readonly template: TemplateEvaluatorPort,
    private readonly engine: EngineActionsExecutor,
  ) {}

  async execute(runId: string): Promise<void> {
    for (let i = 0; i < MAX_STEPS_PER_PASS; i++) {
      const run = await this.runs.findById(runId);
      if (!run || run.status !== 'RUNNING') return;

      const definition = await this.definitions.findById(run.definitionId);
      if (!definition) {
        await this.markFailed(runId, 'Definición de workflow no encontrada.');
        return;
      }

      const step = findStep(definition.dsl, run.currentStepKey);
      if (!step) {
        await this.runs.update(runId, {
          status: 'COMPLETED',
          finishedAt: new Date(),
        });
        return;
      }

      const triggerEvent = run.triggerEventId
        ? await this.events.findById(run.triggerEventId)
        : null;

      const scope: TemplateScope = {
        event: triggerEvent
          ? {
              type: triggerEvent.type,
              payload: triggerEvent.payload,
              occurredAt: triggerEvent.occurredAt,
              correlationId: triggerEvent.correlationId,
            }
          : null,
        context: run.context,
        steps: await this.steps.outputsByRun(runId),
        now: { iso: new Date().toISOString(), ms: Date.now() },
        config: {},
      };

      const input = this.template.render(step.input ?? {}, scope);

      const exec = await this.steps.start({
        runId,
        stepKey: step.key,
        actionKey: step.action,
        attempt: 1,
        input,
      });

      try {
        if (isEngineAction(step.action)) {
          const result = await this.engine.execute(
            step,
            input,
            run,
            definition.dsl,
          );
          await this.steps.complete(exec.id, result.output);

          if (result.kind === 'pause') {
            await this.runs.update(runId, { status: 'WAITING' });
            return;
          }

          const patch: UpdateRunData = { currentStepKey: result.nextStepKey };
          if (result.contextPatch) {
            patch.context = { ...run.context, ...result.contextPatch };
          }
          if (result.nextStepKey === null) {
            patch.status = 'COMPLETED';
            patch.finishedAt = new Date();
          }
          await this.runs.update(runId, patch);
          if (result.nextStepKey === null) return;
          continue;
        }

        // Handler externo: validar input contra su Zod schema y ejecutar.
        const handler = this.registry.resolve(step.action);
        const parsed = handler.inputSchema.parse(input);
        const output = await handler.execute(
          {
            runId,
            definitionKey: definition.key,
            triggerEvent: triggerEvent
              ? { type: triggerEvent.type, payload: triggerEvent.payload }
              : null,
            context: run.context,
            dryRun: run.isDryRun,
          },
          parsed,
        );
        await this.steps.complete(exec.id, output ?? null);

        const nextKey = resolveNextStepKey(definition.dsl, step.key);
        const patch: UpdateRunData = { currentStepKey: nextKey };
        if (nextKey === null) {
          patch.status = 'COMPLETED';
          patch.finishedAt = new Date();
        }
        await this.runs.update(runId, patch);
        if (nextKey === null) return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.steps.fail(exec.id, message);
        await this.runs.update(runId, {
          status: 'FAILED',
          finishedAt: new Date(),
          lastError: message,
        });
        // El fallo se modela como un evento (spec §8.3); las alertas/limpieza
        // son otros workflows que escuchan `workflow.run_failed`.
        await this.events.create({
          type: 'workflow.run_failed',
          payload: {
            runId,
            definitionKey: definition.key,
            stepKey: step.key,
            error: message,
          },
        });
        this.logger.warn(`Run ${runId} FAILED en step ${step.key}: ${message}`);
        return;
      }
    }

    await this.markFailed(
      runId,
      'Excedido el máximo de steps por pasada (posible ciclo en el DSL).',
    );
  }

  private async markFailed(runId: string, error: string): Promise<void> {
    await this.runs.update(runId, {
      status: 'FAILED',
      finishedAt: new Date(),
      lastError: error,
    });
  }
}
