import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowTrigger } from '../../domain/entities/workflow-trigger.entity';
import { StartWorkflowRunsUseCase } from '../../application/use-cases/start-workflow-runs.use-case';
import { ResumeDuePendingActionsUseCase } from '../../application/use-cases/resume-due-pending-actions.use-case';
import {
  CRON_CLOCK,
  type CronClockPort,
} from '../../application/ports/cron-clock.port';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
} from '../../application/ports/event-repository.port';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type WorkflowDefinitionRepositoryPort,
} from '../../application/ports/workflow-definition-repository.port';
import {
  WORKFLOW_TRIGGER_REPOSITORY,
  type WorkflowTriggerRepositoryPort,
} from '../../application/ports/workflow-trigger-repository.port';
import { TargetDescriptor } from '../../application/ports/target-resolver.port';

// Scheduler de workflows. Cada minuto busca los triggers CRON vencidos, los
// dispara (creando un evento sintético `workflow.cron.<key>` y delegando en
// StartWorkflowRuns, que hace el fan-out por target) y reprograma su próximo
// disparo. v1 monoinstancia: la reserva del slot es "reprogramar antes de
// disparar"; el locking distribuido real es una iteración posterior.
@Injectable()
export class WorkflowSchedulerService {
  private readonly logger = new Logger(WorkflowSchedulerService.name);

  constructor(
    @Inject(WORKFLOW_TRIGGER_REPOSITORY)
    private readonly triggers: WorkflowTriggerRepositoryPort,
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
    @Inject(CRON_CLOCK) private readonly cron: CronClockPort,
    private readonly start: StartWorkflowRunsUseCase,
    private readonly resume: ResumeDuePendingActionsUseCase,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<{ fired: number; resumed: number }> {
    const now = new Date();

    // 1) Dispara los triggers cron vencidos.
    const due = await this.triggers.findDueCronTriggers(now);
    let fired = 0;
    for (const trigger of due) {
      try {
        if (await this.fire(trigger, now)) fired++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Trigger cron ${trigger.id} falló: ${message}`);
      }
    }

    // 2) Reanuda los runs con delay/retry vencidos.
    const resumed = await this.resume.execute(now);

    if (fired > 0 || resumed > 0) {
      this.logger.log(
        `Scheduler: ${fired} trigger(s) disparado(s), ${resumed} run(s) reanudado(s).`,
      );
    }
    return { fired, resumed };
  }

  // Devuelve true si ESTA instancia disparó el trigger (reclamó su slot).
  private async fire(trigger: WorkflowTrigger, now: Date): Promise<boolean> {
    if (!trigger.cronExpression) return false;

    // Reclama el slot de forma atómica (reprograma solo si nextFireAt no cambió).
    // Si otra instancia lo reclamó primero, no dispares: evita el doble disparo.
    const claimed = await this.triggers.claimCronSlot(
      trigger.id,
      trigger.nextFireAt ?? null,
      this.cron.next(trigger.cronExpression, now),
    );
    if (!claimed) return false;

    const definition = await this.definitions.findById(trigger.definitionId);
    if (!definition) return false;

    const event = await this.events.create({
      type: `workflow.cron.${definition.key}`,
      payload: trigger.cronPayload ?? {},
    });

    await this.start.execute({
      definition,
      event,
      triggerKind: 'cron',
      target: (trigger.target ?? null) as TargetDescriptor | null,
    });
    return true;
  }
}
