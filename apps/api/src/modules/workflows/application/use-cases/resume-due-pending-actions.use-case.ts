import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  findStep,
  resolveNextStepKey,
  StepDefinition,
  WorkflowDsl,
} from '../../domain/dsl/workflow-dsl';
import { PendingAction } from '../../domain/entities/pending-action.entity';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import { evaluateMatch } from '../../domain/match/match-evaluator';
import { MatchExpression } from '../../domain/match/match-expression';
import { nextPollAt } from '../../domain/wait';
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
//   - WAIT_CONDITION: reevalúa la condición sobre el contexto. Si se cumple, sigue
//     por onMatch; si venció el deadline, por onTimeout; si no, reprograma el
//     siguiente poll y el run sigue en WAITING.
// `wait_for_event` (reanudación por llegada de evento) es otra iteración.
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

  // Devuelve cuántos runs se reanudaron efectivamente (avanzaron de step).
  async execute(
    now: Date = new Date(),
    limit = DEFAULT_BATCH,
  ): Promise<number> {
    const due = await this.pending.findDue({
      now,
      kinds: ['DELAY', 'RETRY', 'WAIT_CONDITION'],
      limit,
    });

    let resumed = 0;
    for (const action of due) {
      try {
        if (await this.resumeOne(action, now)) resumed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Acción diferida ${action.id} (${action.kind}) falló al reanudar: ${message}`,
        );
      }
    }
    return resumed;
  }

  private async resumeOne(action: PendingAction, now: Date): Promise<boolean> {
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

    const definition = await this.definitions.findById(run.definitionId);
    const step = definition
      ? findStep(definition.dsl, action.stepKey ?? run.currentStepKey)
      : null;

    if (action.kind === 'WAIT_CONDITION') {
      return this.resumeWaitCondition(action, run, now, definition?.dsl, step);
    }

    // DELAY: avanzar al step siguiente al del delay antes de continuar.
    const nextKey =
      definition && step ? resolveNextStepKey(definition.dsl, step.key) : null;
    await this.transition(run.id, nextKey);
    return true;
  }

  private async resumeWaitCondition(
    action: PendingAction,
    run: WorkflowRun,
    now: Date,
    dsl: WorkflowDsl | undefined,
    step: StepDefinition | null,
  ): Promise<boolean> {
    const met = evaluateMatch(
      action.matchExpression as MatchExpression | null,
      run.context,
    );
    const timedOut =
      action.deadlineAt != null && now.getTime() >= action.deadlineAt.getTime();

    if (met || timedOut) {
      const fallback = dsl && step ? resolveNextStepKey(dsl, step.key) : null;
      const nextKey = met
        ? (step?.onMatch ?? fallback)
        : (step?.onTimeout ?? fallback);
      await this.transition(run.id, nextKey);
      return true;
    }

    // Condición aún no cumplida y sin vencer: reprograma el siguiente poll.
    const pollInterval = step?.input?.pollInterval as
      | string
      | number
      | undefined;
    await this.pending.create({
      runId: run.id,
      stepKey: action.stepKey,
      kind: 'WAIT_CONDITION',
      matchExpression: action.matchExpression,
      runAt: nextPollAt(pollInterval, action.deadlineAt, now),
      deadlineAt: action.deadlineAt,
    });
    return false;
  }

  // Mueve el run a `nextKey` (RUNNING + advance) o lo completa si es null.
  private async transition(
    runId: string,
    nextKey: string | null,
  ): Promise<void> {
    const patch: UpdateRunData = { currentStepKey: nextKey };
    if (nextKey === null) {
      patch.status = 'COMPLETED';
      patch.finishedAt = new Date();
    } else {
      patch.status = 'RUNNING';
    }
    await this.runs.update(runId, patch);
    if (nextKey !== null) await this.advance.execute(runId);
  }
}
