import { Module } from '@nestjs/common';
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

// Adapters
import { PrismaEventRepository } from './infrastructure/persistence/prisma-event.repository';
import { PrismaWorkflowDefinitionRepository } from './infrastructure/persistence/prisma-workflow-definition.repository';
import { PrismaWorkflowTriggerRepository } from './infrastructure/persistence/prisma-workflow-trigger.repository';
import { PrismaWorkflowRunRepository } from './infrastructure/persistence/prisma-workflow-run.repository';
import { PrismaWorkflowStepRepository } from './infrastructure/persistence/prisma-workflow-step.repository';
import { PrismaPendingActionRepository } from './infrastructure/persistence/prisma-pending-action.repository';
import { JsonPathTemplateEvaluator } from './infrastructure/template/jsonpath-template.evaluator';
import { NestActionHandlerRegistry } from './infrastructure/engine/nest-action-handler.registry';
import { EngineActionsExecutor } from './infrastructure/engine/engine-actions.executor';
import { LogActionHandler } from './infrastructure/handlers/log.handler';

// Use cases
import { AdvanceWorkflowRunUseCase } from './application/use-cases/advance-workflow-run.use-case';
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

// Motor de eventos + workflows (v1 síncrono). El runtime asíncrono (scheduler,
// reanudación de delay/wait, cron, retries, dry-run) es una iteración posterior.
@Module({
  imports: [IamModule],
  controllers: [
    WorkflowsController,
    EventsController,
    WorkflowRunsController,
    WorkflowHandlersController,
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

    // Handlers built-in. Otros módulos podrán registrar los suyos cuando se
    // añada el patrón forRoot; en v1 el registry se construye con estos.
    LogActionHandler,
    {
      provide: ACTION_HANDLER_REGISTRY,
      useFactory: (log: LogActionHandler) =>
        new NestActionHandlerRegistry([log]),
      inject: [LogActionHandler],
    },

    EngineActionsExecutor,

    AdvanceWorkflowRunUseCase,
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
