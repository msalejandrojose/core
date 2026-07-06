import { Inject, Injectable, Logger } from '@nestjs/common';
import { findStep, resolveNextStepKey } from '../../domain/dsl/workflow-dsl';
import { PendingAction } from '../../domain/entities/pending-action.entity';
import { AdvanceWorkflowRunUseCase } from './advance-workflow-run.use-case';
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
  type UpdateRunData,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';

// Máximo de acciones diferidas procesadas por pasada (guard-rail del tick).
const DEFAULT_BATCH = 50;

// Resumer del scheduler: consume las acciones diferidas vencidas (`runAt <= now`)
// y reanuda sus runs.
//   - RETRY: reintenta el MISMO step (currentStepKey no cambió al fallar) con el
//     intento incrementado; el conteo de intentos lo lleva advance vía countAttempts.
//   - DELAY: la pausa dejó el run parado EN el step delay, así que hay que avanzar
//     a su `next` antes de continuar (si no, se re-dispararía el delay en bucle).
// `wait_for_event` (reanudación por llegada de evento / timeout) es otra iteración.
@Injectable()
export class ResumeDuePendingActionsUseCase {
  private readonly logger = new Logger(ResumeDuePendingActionsUseCase.name);

  constructor(
    @Inject(PENDING_ACTION_REPOSITORY)
    private readonly pending: PendingActionRepositoryPort,
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    private readonly advance: AdvanceWorkflowRunUseCase,
  ) {}

  // Devuelve cuántos runs se reanudaron efectivamente.
  async execute(
    now: Date = new Date(),
    limit = DEFAULT_BATCH,
  ): Promise<number> {
    const due = await this.pending.findDue({
      now,
      kinds: ['DELAY', 'RETRY'],
      limit,
    });

    let resumed = 0;
    for (const action of due) {
      try {
        if (await this.resumeOne(action)) resumed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Acción diferida ${action.id} (${action.kind}) falló al reanudar: ${message}`,
        );
      }
    }
    return resumed;
  }

  private async resumeOne(action: PendingAction): Promise<boolean> {
    // Reclama la acción de forma atómica antes de tocar el run (idempotencia).
    const claimed = await this.pending.markConsumed(action.id);
    if (!claimed || !action.runId) return false;

    const run = await this.runs.findById(action.runId);
    // Solo se reanuda un run que siga en espera (no cancelado/fallido/terminado).
    if (!run || run.status !== 'WAITING') return false;

    if (action.kind === 'RETRY') {
      await this.runs.update(run.id, { status: 'RUNNING' });
      await this.advance.execute(run.id);
      return true;
    }

    // DELAY: avanzar al step siguiente al del delay antes de continuar.
    const definition = await this.definitions.findById(run.definitionId);
    const step = definition
      ? findStep(definition.dsl, action.stepKey ?? run.currentStepKey)
      : null;
    const nextKey =
      definition && step ? resolveNextStepKey(definition.dsl, step.key) : null;

    const patch: UpdateRunData = { currentStepKey: nextKey };
    if (nextKey === null) {
      patch.status = 'COMPLETED';
      patch.finishedAt = new Date();
    } else {
      patch.status = 'RUNNING';
    }
    await this.runs.update(run.id, patch);

    if (nextKey !== null) await this.advance.execute(run.id);
    return true;
  }
}
