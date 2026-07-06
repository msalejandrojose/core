import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { IamModule } from '../iam/iam.module';

// Ports (tokens)
import { EVENT_REPOSITORY } from './application/ports/event-repository.port';
import { WORKFLOW_DEFINITION_REPOSITORY } from './application/ports/workflow-definition-repository.port';
import { WORKFLOW_TRIGGER_REPOSITORY } from './application/ports/workflow-trigger-repository.port';
import { WORKFLOW_RUN_REPOSITORY } from './application/ports/workflow-run-repository.port';
import { WORKFLOW_STEP_REPOSITORY } from './application/ports/workflow-step-repository.port';
import { PENDING_ACTION_REPOSITORY } from './application/ports/pending-action-repository.port';
import { TEMPLATE_EVALUATOR } from './application/ports/template-evaluator.port';
import { ACTION_HANDLER_REGISTRY } from './application/ports/action-handler-registry.port';
import { CONTEXT_ENRICHER_REGISTRY } from './application/ports/context-enricher-registry.port';
import { TARGET_RESOLVER_REGISTRY } from './application/ports/target-resolver-registry.port';
import { CRON_CLOCK } from './application/ports/cron-clock.port';

// Adapters
import { PrismaEventRepository } from './infrastructure/persistence/prisma-event.repository';
import { PrismaWorkflowDefinitionRepository } from './infrastructure/persistence/prisma-workflow-definition.repository';
import { PrismaWorkflowTriggerRepository } from './infrastructure/persistence/prisma-workflow-trigger.repository';
import { PrismaWorkflowRunRepository } from './infrastructure/persistence/prisma-workflow-run.repository';
import { PrismaWorkflowStepRepository } from './infrastructure/persistence/prisma-workflow-step.repository';
import { PrismaPendingActionRepository } from './infrastructure/persistence/prisma-pending-action.repository';
import { JsonPathTemplateEvaluator } from './infrastructure/template/jsonpath-template.evaluator';
import { NestActionHandlerRegistry } from './infrastructure/engine/nest-action-handler.registry';
import { NestContextEnricherRegistry } from './infrastructure/engine/nest-context-enricher.registry';
import { NestTargetResolverRegistry } from './infrastructure/engine/nest-target-resolver.registry';
import { EngineActionsExecutor } from './infrastructure/engine/engine-actions.executor';
import { LogActionHandler } from './infrastructure/handlers/log.handler';
import { TriggerContextEnricher } from './infrastructure/enrichers/trigger-context.enricher';
import { TargetContextEnricher } from './infrastructure/enrichers/target-context.enricher';
import { UsersTargetResolver } from './infrastructure/targets/users.target-resolver';
import { CronParserClock } from './infrastructure/scheduler/cron-parser.clock';
import { WorkflowSchedulerService } from './infrastructure/scheduler/workflow-scheduler.service';

// Use cases
import { AdvanceWorkflowRunUseCase } from './application/use-cases/advance-workflow-run.use-case';
import { ResumeDuePendingActionsUseCase } from './application/use-cases/resume-due-pending-actions.use-case';
import { StartWorkflowRunsUseCase } from './application/use-cases/start-workflow-runs.use-case';
import { RegisterEventUseCase } from './application/use-cases/register-event.use-case';
import { PublishWorkflowDefinitionUseCase } from './application/use-cases/publish-workflow-definition.use-case';
import { ActivateWorkflowDefinitionUseCase } from './application/use-cases/activate-workflow-definition.use-case';
import { TriggerManualRunUseCase } from './application/use-cases/trigger-manual-run.use-case';
import { ListWorkflowDefinitionsUseCase } from './application/use-cases/list-workflow-definitions.use-case';
import { ListEventsUseCase } from './application/use-cases/list-events.use-case';
import { ListWorkflowRunsUseCase } from './application/use-cases/list-workflow-runs.use-case';
import { GetWorkflowRunUseCase } from './application/use-cases/get-workflow-run.use-case';
import { CancelWorkflowRunUseCase } from './application/use-cases/cancel-workflow-run.use-case';

// HTTP
import { WorkflowsController } from './infrastructure/http/workflows.controller';
import { EventsController } from './infrastructure/http/events.controller';
import { WorkflowRunsController } from './infrastructure/http/workflow-runs.controller';
import { WorkflowHandlersController } from './infrastructure/http/workflow-handlers.controller';
import { SchedulerController } from './infrastructure/http/scheduler.controller';

// Motor de eventos + workflows. Disparo por evento, cron (scheduler) y manual/
// inmediato, con fan-out por target (un run por entidad). La reanudación de
// delay/wait y los retries siguen siendo una iteración posterior.
@Module({
  imports: [IamModule, DiscoveryModule],
  controllers: [
    WorkflowsController,
    EventsController,
    WorkflowRunsController,
    WorkflowHandlersController,
    SchedulerController,
  ],
  providers: [
    { provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
    {
      provide: WORKFLOW_DEFINITION_REPOSITORY,
      useClass: PrismaWorkflowDefinitionRepository,
    },
    {
      provide: WORKFLOW_TRIGGER_REPOSITORY,
      useClass: PrismaWorkflowTriggerRepository,
    },
    { provide: WORKFLOW_RUN_REPOSITORY, useClass: PrismaWorkflowRunRepository },
    {
      provide: WORKFLOW_STEP_REPOSITORY,
      useClass: PrismaWorkflowStepRepository,
    },
    {
      provide: PENDING_ACTION_REPOSITORY,
      useClass: PrismaPendingActionRepository,
    },
    { provide: TEMPLATE_EVALUATOR, useClass: JsonPathTemplateEvaluator },

    // Handlers built-in. Otros módulos registran los suyos declarándolos como
    // providers y decorándolos con `@WorkflowActionHandler()`: el registry los
    // descubre vía DiscoveryService en `onApplicationBootstrap`.
    LogActionHandler,
    { provide: ACTION_HANDLER_REGISTRY, useClass: NestActionHandlerRegistry },

    // Enrichers de contexto built-in. Se aplican en cadena al crear un run, en
    // el orden en que se listan aquí. Otros módulos añadirán los suyos a esta
    // lista cuando se añada el patrón forRoot.
    TriggerContextEnricher,
    TargetContextEnricher,
    {
      provide: CONTEXT_ENRICHER_REGISTRY,
      useFactory: (
        trigger: TriggerContextEnricher,
        target: TargetContextEnricher,
      ) => new NestContextEnricherRegistry([trigger, target]),
      inject: [TriggerContextEnricher, TargetContextEnricher],
    },

    // Resolvers de target built-in (fan-out sobre entidades del sistema).
    UsersTargetResolver,
    {
      provide: TARGET_RESOLVER_REGISTRY,
      useFactory: (users: UsersTargetResolver) =>
        new NestTargetResolverRegistry([users]),
      inject: [UsersTargetResolver],
    },

    // Reloj de cron (scheduler).
    { provide: CRON_CLOCK, useClass: CronParserClock },
    WorkflowSchedulerService,

    EngineActionsExecutor,

    AdvanceWorkflowRunUseCase,
    ResumeDuePendingActionsUseCase,
    StartWorkflowRunsUseCase,
    RegisterEventUseCase,
    PublishWorkflowDefinitionUseCase,
    ActivateWorkflowDefinitionUseCase,
    TriggerManualRunUseCase,
    ListWorkflowDefinitionsUseCase,
    ListEventsUseCase,
    ListWorkflowRunsUseCase,
    GetWorkflowRunUseCase,
    CancelWorkflowRunUseCase,
  ],
  // RegisterEventUseCase se exporta para que otros módulos disparen eventos
  // (spec §13.1) inyectándolo.
  exports: [RegisterEventUseCase],
})
export class WorkflowsModule {}
