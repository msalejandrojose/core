import { Inject, Injectable } from '@nestjs/common';
import { evaluateMatch } from '../../domain/match/match-evaluator';
import { MatchExpression } from '../../domain/match/match-expression';
import {
  resolveNextStepKey,
  StepDefinition,
  WorkflowDsl,
} from '../../domain/dsl/workflow-dsl';
import { parseDurationSeconds } from '../../domain/value-objects/duration.vo';
import { nextPollAt } from '../../domain/wait';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../../application/ports/event-repository.port';
import {
  PENDING_ACTION_REPOSITORY,
  type PendingActionRepositoryPort,
} from '../../application/ports/pending-action-repository.port';

// Resultado de ejecutar una acción del motor:
// - `continue`: avanza a `nextStepKey` (null = run COMPLETED). Puede traer un
//   `contextPatch` a fusionar en `run.context`.
// - `pause`: el run pasa a WAITING (delay / wait_for_event). Su reanudación la
//   hará el scheduler (iteración posterior).
export type EngineExecutionResult =
  | {
      kind: 'continue';
      nextStepKey: string | null;
      output: unknown;
      contextPatch?: Record<string, unknown>;
    }
  | { kind: 'pause'; output: unknown };

@Injectable()
export class EngineActionsExecutor {
  constructor(
    @Inject(PENDING_ACTION_REPOSITORY)
    private readonly pending: PendingActionRepositoryPort,
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
  ) {}

  async execute(
    step: StepDefinition,
    input: Record<string, unknown>,
    run: WorkflowRun,
    dsl: WorkflowDsl,
  ): Promise<EngineExecutionResult> {
    const next = () => resolveNextStepKey(dsl, step.key);

    switch (step.action) {
      case 'context.set':
        return {
          kind: 'continue',
          nextStepKey: next(),
          output: { keys: Object.keys(input) },
          contextPatch: input,
        };

      case 'branch': {
        const when = (input.when ?? null) as MatchExpression | null;
        const matched = evaluateMatch(when, run.context);
        const then = (input.then as string | undefined) ?? null;
        const els = (input.else as string | undefined) ?? next();
        return {
          kind: 'continue',
          nextStepKey: matched ? then : els,
          output: { matched },
        };
      }

      case 'delay': {
        if (run.isDryRun) {
          return {
            kind: 'continue',
            nextStepKey: next(),
            output: { simulated: true },
          };
        }
        const seconds = parseDurationSeconds(input.duration as string | number);
        await this.pending.create({
          runId: run.id,
          stepKey: step.key,
          kind: 'DELAY',
          runAt: new Date(Date.now() + seconds * 1000),
        });
        return { kind: 'pause', output: { delayedSeconds: seconds } };
      }

      case 'wait_for_condition': {
        const condition = (input.condition ?? null) as MatchExpression | null;

        // Si ya se cumple, no espera: continúa por onMatch (o el siguiente).
        if (run.isDryRun || evaluateMatch(condition, run.context)) {
          return {
            kind: 'continue',
            nextStepKey: step.onMatch ?? next(),
            output: run.isDryRun ? { simulated: true } : { met: true },
          };
        }

        const timeout = input.timeout as string | number | undefined;
        const deadlineAt =
          timeout != null
            ? new Date(Date.now() + parseDurationSeconds(timeout) * 1000)
            : null;
        await this.pending.create({
          runId: run.id,
          stepKey: step.key,
          kind: 'WAIT_CONDITION',
          matchExpression: condition,
          runAt: nextPollAt(
            input.pollInterval as string | number | undefined,
            deadlineAt,
          ),
          deadlineAt,
        });
        return { kind: 'pause', output: { waitingCondition: true } };
      }

      case 'wait_for_event': {
        if (run.isDryRun) {
          return {
            kind: 'continue',
            nextStepKey: step.onTimeout ?? next(),
            output: { simulated: true },
          };
        }
        const eventType = input.event as string;
        const timeout = input.timeout as string | number | undefined;
        const runAt =
          timeout != null
            ? new Date(Date.now() + parseDurationSeconds(timeout) * 1000)
            : null;
        await this.pending.create({
          runId: run.id,
          stepKey: step.key,
          kind: 'WAIT_EVENT',
          eventType,
          matchExpression: input.match ?? null,
          runAt,
        });
        return { kind: 'pause', output: { waitingFor: eventType } };
      }

      case 'event.emit': {
        // v1: persiste el evento (auditoría). El re-matching de triggers para
        // eventos emitidos por el motor es parte de la iteración del scheduler.
        if (!run.isDryRun) {
          await this.events.create({
            type: input.type as string,
            payload: input.payload ?? {},
            correlationId: (input.correlationId as string) ?? null,
          });
        }
        return {
          kind: 'continue',
          nextStepKey: next(),
          output: { emitted: input.type },
        };
      }

      case 'workflow.start': {
        // v1: persiste un evento manual sintético para el child (fire-and-forget).
        // El arranque efectivo del child run llega con el scheduler/event-bus.
        if (!run.isDryRun) {
          await this.events.create({
            type: `workflow.manual.${input.key as string}`,
            payload: input.payload ?? {},
          });
        }
        return {
          kind: 'continue',
          nextStepKey: next(),
          output: { started: input.key },
        };
      }

      default:
        throw new Error(`Acción de motor desconocida: ${step.action}`);
    }
  }
}
